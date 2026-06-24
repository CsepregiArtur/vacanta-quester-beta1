import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/local_db.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _pinCtrl = TextEditingController();
  bool _loading = false;
  bool _isRegister = false;
  final _nameCtrl = TextEditingController();

  Future<void> _submit() async {
    setState(() => _loading = true);
    try {
      if (_isRegister) {
        final res = await ApiService.instance.register(
          _emailCtrl.text, _nameCtrl.text, _pinCtrl.text,
        );
        if (res != null && mounted) {
          Navigator.pushReplacement(context, MaterialPageRoute(
            builder: (_) => const HomeScreen(),
          ));
        }
      } else {
        final res = await ApiService.instance.login(
          _emailCtrl.text, _pinCtrl.text,
        );
        if (res != null && mounted) {
          Navigator.pushReplacement(context, MaterialPageRoute(
            builder: (_) => const HomeScreen(),
          ));
        }
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('🎮', style: TextStyle(fontSize: 64)),
              const SizedBox(height: 16),
              Text(
                _isRegister ? 'Cont Nou' : 'Vacanța Activă',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 32),
              if (_isRegister) TextField(
                controller: _nameCtrl,
                decoration: const InputDecoration(labelText: 'Nume Părinte'),
              ),
              TextField(
                controller: _emailCtrl,
                decoration: const InputDecoration(labelText: 'Email'),
                keyboardType: TextInputType.emailAddress,
              ),
              TextField(
                controller: _pinCtrl,
                decoration: const InputDecoration(labelText: 'PIN (4 cifre)'),
                maxLength: 4,
                obscureText: true,
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _loading ? null : _submit,
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF58CC02),
                  minimumSize: const Size(double.infinity, 48),
                ),
                child: _loading
                    ? const CircularProgressIndicator()
                    : Text(_isRegister ? 'Înregistrează-te' : 'Conectează-te'),
              ),
              TextButton(
                onPressed: () => setState(() => _isRegister = !_isRegister),
                child: Text(_isRegister
                    ? 'Ai deja cont? Loghează-te'
                    : 'Prima vizită? Înregistrează-te'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
