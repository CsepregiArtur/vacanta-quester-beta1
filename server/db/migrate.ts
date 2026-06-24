/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Migration Tool — JSON → PostgreSQL
 * Rulează: npx tsx server/db/migrate.ts
 */

import fs from "fs";
import path from "path";
import { query, initDatabase } from "./index";
import bcrypt from "bcryptjs";

const DATA_DIR = path.join(process.cwd(), "src", "data");

async function migrate() {
  console.log("=== Migrare JSON → PostgreSQL ===");
  
  // Re-creăm schema de la zero
  try { await query(`DROP TABLE IF EXISTS sync_queue CASCADE`); } catch {}
  try { await query(`DROP TABLE IF EXISTS reading_history CASCADE`); } catch {}
  try { await query(`DROP TABLE IF EXISTS point_transactions CASCADE`); } catch {}
  try { await query(`DROP TABLE IF EXISTS rewards CASCADE`); } catch {}
  try { await query(`DROP TABLE IF EXISTS photos CASCADE`); } catch {}
  try { await query(`DROP TABLE IF EXISTS transactions CASCADE`); } catch {}
  try { await query(`DROP TABLE IF EXISTS activities CASCADE`); } catch {}
  try { await query(`DROP TABLE IF EXISTS children CASCADE`); } catch {}
  try { await query(`DROP TABLE IF EXISTS parents CASCADE`); } catch {}
  try { await query(`DROP TABLE IF EXISTS families CASCADE`); } catch {}
  
  await initDatabase();
  
  // Citește users.json
  const usersPath = path.join(DATA_DIR, "users.json");
  if (!fs.existsSync(usersPath)) {
    console.log("Nu există users.json — skip migration");
    return;
  }
  
  const users = JSON.parse(fs.readFileSync(usersPath, "utf-8"));
  console.log(`Găsiți ${users.length} utilizatori`);
  
  for (const user of users) {
    // Creează familia
    const { rows: [family] } = await query(
      `INSERT INTO families (name) VALUES ($1) RETURNING id`,
      [user.name + "'s Family"]
    );
    console.log(`  Familie creată: ${family.id}`);
    
    // Creează părintele
    const pinHash = user.pinHash || await bcrypt.hash(user.pin || "0000", 10);
    const { rows: [parent] } = await query(
      `INSERT INTO parents (family_id, email, name, pin_hash) VALUES ($1, $2, $3, $4) RETURNING id`,
      [family.id, user.email, user.name, pinHash]
    );
    console.log(`  Părinte: ${user.email}`);
    
    // Migrează copiii din family DB
    const cleanEmail = user.email.toLowerCase().replace(/[^a-z0-9_.]/g, "_");
    const familyDbPath = path.join(DATA_DIR, `db_family_${cleanEmail}.json`);
    
    if (fs.existsSync(familyDbPath)) {
      const familyDb = JSON.parse(fs.readFileSync(familyDbPath, "utf-8"));
      
      for (const child of (familyDb.children || [])) {
        const birthYear = new Date().getFullYear() - (child.age || 10);
        const { rows: [dbChild] } = await query(
          `INSERT INTO children (family_id, name, avatar, birth_year, points, reading_streak, days_since_last_reading)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [family.id, child.name, child.avatar || "🐶", birthYear, child.points || 0, child.readingStreak || 0, child.daysSinceLastReading || 0]
        );
        console.log(`    Copil: ${child.name} (${dbChild.id})`);
        
        // Migrează reading history
        for (const rh of (familyDb.readingHistory || []).filter((h: any) => h.childId === child.id)) {
          await query(
            `INSERT INTO reading_history (child_id, topic, word_count, score) VALUES ($1, $2, $3, $4)`,
            [dbChild.id, rh.topic || "Migrated", rh.wordCount || 0, rh.score || 0]
          );
        }
        
        // Migrează activități
        for (const task of (familyDb.activeTasks || []).filter((t: any) => t.childId === child.id)) {
          await query(
            `INSERT INTO activities (child_id, family_id, title, description, type, status, points)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [dbChild.id, family.id, task.name || task.title || "Activitate", task.description || "", task.type || "chore", task.status || "pending", task.points || 0]
          );
        }
        
        // Migrează tranzacții
        for (const txn of (familyDb.activityTimeLogs || []).filter((l: any) => l.childId === child.id)) {
          await query(
            `INSERT INTO point_transactions (child_id, points, reason) VALUES ($1, $2, $3)`,
            [dbChild.id, txn.durationSeconds ? Math.round(txn.durationSeconds / 60) : 0, txn.activityName || "Migrated"]
          );
        }
      }
      
      // Actualizează configurațiile familiei
      await query(
        `UPDATE families SET 
           dog_walk_enabled = $1,
           home_assistant_config = $2,
           smtp_config = $3
         WHERE id = $4`,
        [
          familyDb.dogWalkEnabled || false,
          JSON.stringify(familyDb.homeAssistant || {}),
          JSON.stringify(familyDb.smtpConfig || {}),
          family.id
        ]
      );
    }
  }
  
  console.log("=== Migrare completă! ===");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
