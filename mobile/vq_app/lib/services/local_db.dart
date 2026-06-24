import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/child.dart';
import '../models/activity.dart';

class LocalDB {
  static final LocalDB instance = LocalDB._();
  LocalDB._();
  Database? _db;

  Future<void> initialize() async {
    final dbPath = await getDatabasesPath();
    _db = await openDatabase(
      join(dbPath, 'vq_app.db'),
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE children (
            id TEXT PRIMARY KEY,
            family_id TEXT NOT NULL,
            name TEXT NOT NULL,
            avatar TEXT DEFAULT '🐶',
            birth_year INTEGER NOT NULL,
            points INTEGER DEFAULT 0,
            reading_streak INTEGER DEFAULT 0,
            days_since_last_reading INTEGER DEFAULT 0,
            version INTEGER DEFAULT 1
          )
        ''');
        await db.execute('''
          CREATE TABLE activities (
            id TEXT PRIMARY KEY,
            child_id TEXT NOT NULL,
            family_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            type TEXT DEFAULT 'chore',
            status TEXT DEFAULT 'pending',
            points INTEGER DEFAULT 0,
            photo_url TEXT,
            version INTEGER DEFAULT 1
          )
        ''');
        await db.execute('''
          CREATE TABLE sync_queue (
            id TEXT PRIMARY KEY,
            action TEXT NOT NULL,
            payload TEXT NOT NULL,
            version INTEGER DEFAULT 1,
            created_at TEXT NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE auth (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          )
        ''');
      },
    );
  }

  Database get db {
    if (_db == null) throw Exception('Database not initialized');
    return _db!;
  }

  // ─── Children ─────────────────────────────────────────────────────
  Future<void> upsertChild(Child child) async {
    await db.insert('children', child.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Child>> getChildren(String familyId) async {
    final maps = await db.query('children',
        where: 'family_id = ?', whereArgs: [familyId]);
    return maps.map((m) => Child.fromMap(m)).toList();
  }

  Future<Child?> getChild(String id) async {
    final maps = await db.query('children', where: 'id = ?', whereArgs: [id]);
    return maps.isEmpty ? null : Child.fromMap(maps.first);
  }

  // ─── Activities ───────────────────────────────────────────────────
  Future<void> upsertActivity(Activity activity) async {
    await db.insert('activities', activity.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Activity>> getPendingActivities(String childId) async {
    final maps = await db.query('activities',
        where: 'child_id = ? AND status = ?',
        whereArgs: [childId, 'pending'],
        orderBy: 'created_at DESC');
    return maps.map((m) => Activity.fromMap(m)).toList();
  }

  // ─── Sync Queue ───────────────────────────────────────────────────
  Future<void> enqueueSync(SyncAction action) async {
    await db.insert('sync_queue', action.toMap());
  }

  Future<List<Map<String, dynamic>>> getPendingSyncs() async {
    return db.query('sync_queue', orderBy: 'created_at ASC');
  }

  Future<void> removeSync(String id) async {
    await db.delete('sync_queue', where: 'id = ?', whereArgs: [id]);
  }

  // ─── Auth ─────────────────────────────────────────────────────────
  Future<void> saveAuth(String key, String value) async {
    await db.insert('auth', {'key': key, 'value': value},
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<String?> getAuth(String key) async {
    final maps = await db.query('auth', where: 'key = ?', whereArgs: [key]);
    return maps.isEmpty ? null : maps.first['value'] as String;
  }

  Future<void> clearAuth() async {
    await db.delete('auth');
  }
}
