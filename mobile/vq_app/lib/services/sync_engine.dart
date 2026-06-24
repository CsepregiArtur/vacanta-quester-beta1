import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'local_db.dart';
import 'api_service.dart';

/// Motor de sincronizare offline-first
/// 
/// 1. Salvează local (SQLite) instant
/// 2. La revenirea internetului, trimite modificările la server
/// 3. Serverul confirmă → elimină din coadă
/// 4. Conflict resolution: Last Write Wins cu version number
class SyncEngine {
  static final SyncEngine instance = SyncEngine._();
  SyncEngine._();
  
  Timer? _timer;
  bool _isSyncing = false;

  void start() {
    // Verifică online/offline
    Connectivity().onConnectivityChanged.listen((results) {
      if (results.any((r) => r != ConnectivityResult.none)) {
        processQueue();
      }
    });

    // Sync automat la fiecare 30s
    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      processQueue();
    });
  }

  void stop() {
    _timer?.cancel();
  }

  /// Adaugă o acțiune în coada de sincronizare
  Future<void> enqueue(String action, Map<String, dynamic> payload) async {
    final id = 'sync_${DateTime.now().millisecondsSinceEpoch}';
    final syncAction = SyncAction(
      id: id,
      action: action,
      payload: payload,
      createdAt: DateTime.now().toIso8601String(),
    );
    await LocalDB.instance.enqueueSync(syncAction);
    // Încearcă sync imediat
    processQueue();
  }

  /// Procesează coada de sincronizare
  Future<void> processQueue() async {
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      final connectivity = await Connectivity().checkConnectivity();
      if (connectivity.any((r) => r == ConnectivityResult.none)) {
        _isSyncing = false;
        return;
      }

      final pending = await LocalDB.instance.getPendingSyncs();
      for (final item in pending) {
        try {
          final syncAction = SyncAction.fromMap(item);
          final success = await ApiService.instance.sendSyncAction(
            syncAction.action,
            syncAction.payload,
          );
          if (success) {
            await LocalDB.instance.removeSync(item['id'] as String);
          }
        } catch (e) {
          print('[SYNC] Failed: $e');
          break; // Stop on first failure, retry later
        }
      }
    } finally {
      _isSyncing = false;
    }
  }

  /// Rezolvă conflictele (Last Write Wins)
  Future<void> resolveConflict(
    String localVersion, 
    String serverVersion,
  ) async {
    // Server version is always authoritative
    // Last Write Wins — serverul decide
  }
}

class SyncAction {
  final String id;
  final String action;
  final Map<String, dynamic> payload;
  final String createdAt;

  SyncAction({
    required this.id,
    required this.action,
    required this.payload,
    this.createdAt = '',
  });
}
