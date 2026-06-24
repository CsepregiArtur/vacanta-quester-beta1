import 'package:flutter/material.dart';
import '../services/local_db.dart';
import '../services/api_service.dart';
import '../services/sync_engine.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Map<String, dynamic>> _children = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      // Încearcă serverul
      final serverState = await ApiService.instance.fetchState();
      if (serverState != null) {
        // Sincronizează datele serverului în SQLite local
        // ...
      }
      
      // Încarcă din SQLite local (offline-first)
      // final children = await LocalDB.instance.getChildren(familyId);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _addActivity() async {
    // Salvează local instant
    // await LocalDB.instance.upsertActivity(activity);
    // Sync în background
    // await SyncEngine.instance.enqueue('create_activity', payload);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Vacanța Activă'),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync),
            onPressed: () => SyncEngine.instance.processQueue(),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : const Center(child: Text('Dashboard')),
    );
  }
}
