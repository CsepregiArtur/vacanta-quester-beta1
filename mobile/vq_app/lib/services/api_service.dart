import 'dart:convert';
import 'package:http/http.dart' as http;
import 'local_db.dart';

class ApiService {
  static final ApiService instance = ApiService._();
  ApiService._();

  // Schimbă URL-ul în funcție de mediu
  static const String baseUrl = 'https://api.cs-hub.xyz';

  Future<Map<String, String>> _headers() async {
    final token = await LocalDB.instance.getAuth('access_token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // ─── Auth ─────────────────────────────────────────────────────────
  Future<Map<String, dynamic>?> login(String email, String password) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );
      if (res.statusCode != 200) return null;
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      if (data['success'] == true) {
        await LocalDB.instance.saveAuth('access_token', data['accessToken']);
        await LocalDB.instance.saveAuth('refresh_token', data['refreshToken']);
        return data;
      }
      return null;
    } catch (e) {
      print('[API] Login error: $e');
      return null;
    }
  }

  // ─── Sync ─────────────────────────────────────────────────────────
  Future<bool> sendSyncAction(String action, Map<String, dynamic> payload) async {
    try {
      final headers = await _headers();
      final res = await http.post(
        Uri.parse('$baseUrl/api/sync/action'),
        headers: headers,
        body: jsonEncode({
          'action': action,
          'payload': payload,
        }),
      );
      return res.statusCode == 200;
    } catch (e) {
      print('[API] Sync error: $e');
      return false;
    }
  }

  /// Pull: obține modificările de la server de la un timestamp
  Future<Map<String, dynamic>?> pullChanges(String? since) async {
    try {
      final headers = await _headers();
      final uri = since != null
          ? Uri.parse('$baseUrl/api/sync/pull?since=$since')
          : Uri.parse('$baseUrl/api/sync/pull');
      final res = await http.get(uri, headers: headers);
      if (res.statusCode != 200) return null;
      return jsonDecode(res.body) as Map<String, dynamic>;
    } catch (e) {
      print('[API] Pull error: $e');
      return null;
    }
  }

  // ─── State ────────────────────────────────────────────────────────
  Future<Map<String, dynamic>?> fetchState() async {
    try {
      final headers = await _headers();
      final res = await http.get(
        Uri.parse('$baseUrl/api/state'),
        headers: headers,
      );
      if (res.statusCode != 200) return null;
      return jsonDecode(res.body) as Map<String, dynamic>;
    } catch (e) {
      print('[API] State error: $e');
      return null;
    }
  }
}
