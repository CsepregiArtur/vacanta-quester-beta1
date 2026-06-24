import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'services/local_db.dart';
import 'services/sync_engine.dart';
import 'services/api_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  // Inițializează baza locală SQLite
  await LocalDB.instance.initialize();
  // Pornește motorul de sincronizare
  SyncEngine.instance.start();

  runApp(const VQApp());
}

class VQApp extends StatelessWidget {
  const VQApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Vacanța Quester',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        fontFamily: 'Fredoka',
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF58CC02), // Duolingo green
          brightness: Brightness.light,
        ),
      ),
      home: const LoginScreen(),
    );
  }
}
