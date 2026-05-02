import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  TextInput, ActivityIndicator, Platform, Animated,
  KeyboardAvoidingView, ScrollView, Dimensions, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useContext, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';

const { height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slide1 = useRef(new Animated.Value(50)).current;
  const slide2 = useRef(new Animated.Value(60)).current;
  const slide3 = useRef(new Animated.Value(70)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(slide1, { toValue: 0, friction: 8, useNativeDriver: true }),
      ]),
      Animated.spring(slide2, { toValue: 0, friction: 8, useNativeDriver: true }),
      Animated.spring(slide3, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Hero Banner */}
      <View style={styles.hero}>
        <View style={styles.heroCircle1} />
        <View style={styles.heroCircle2} />
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slide1 }], alignItems: 'center' }}>
          <View style={styles.heroIconBg}>
            <Ionicons name="cafe" size={40} color={COLORS.white} />
          </View>
          <Text style={styles.heroTitle}>Welcome Back</Text>
          <Text style={styles.heroSub}>Sign in to continue to CafeSync</Text>
        </Animated.View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {error ? (
            <Animated.View style={[styles.errorBanner, { opacity: fadeAnim }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            </Animated.View>
          ) : null}

          {/* Email */}
          <Animated.View style={{ transform: [{ translateY: slide2 }], opacity: fadeAnim }}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputBox, email.length > 0 && styles.inputBoxActive]}>
              <Ionicons name="mail-outline" size={20} color={email.length > 0 ? COLORS.primary : COLORS.textLight} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={COLORS.textLight}
                value={email}
                onChangeText={v => { setEmail(v); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </Animated.View>

          {/* Password */}
          <Animated.View style={{ transform: [{ translateY: slide3 }], opacity: fadeAnim }}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.inputBox, password.length > 0 && styles.inputBoxActive]}>
              <Ionicons name="lock-closed-outline" size={20} color={password.length > 0 ? COLORS.primary : COLORS.textLight} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.textLight}
                value={password}
                onChangeText={v => { setPassword(v); setError(''); }}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Image 
                  source={showPass ? require('../../../assets/images/eye_show.png') : require('../../../assets/images/eye_hide.png')} 
                  style={{ width: 20, height: 20, tintColor: COLORS.textLight }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Login Button */}
          <Animated.View style={{ transform: [{ translateY: slide3 }], opacity: fadeAnim, marginTop: 24 }}>
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={COLORS.white} />
                : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.primaryBtnText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                  </View>
                )}
            </TouchableOpacity>
          </Animated.View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register Link */}
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.75}
          >
            <Text style={styles.ghostBtnText}>Create New Account</Text>
          </TouchableOpacity>

          {/* Quick Hint */}
          <Text style={styles.hint}>Admin: admin@cafesync.com / admin123</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  hero: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 40,
    alignItems: 'center',
    overflow: 'hidden',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  heroCircle1: {
    position: 'absolute', top: -40, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroCircle2: {
    position: 'absolute', bottom: -60, left: -30,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  heroIconBg: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: { fontSize: 30, fontWeight: '900', color: COLORS.white, letterSpacing: 0.5 },
  heroSub: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 6 },
  form: { padding: 24, paddingTop: 28, paddingBottom: 40 },
  errorBanner: {
    backgroundColor: COLORS.dangerLight,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: { color: COLORS.danger, fontSize: 14, fontWeight: '600' },
  label: {
    fontSize: 14, fontWeight: '700', color: COLORS.textMid,
    marginBottom: 8, marginTop: 16, letterSpacing: 0.3,
  },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: COLORS.divider,
    height: 54, gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.05)' },
    }),
  },
  inputBoxActive: { borderColor: COLORS.primary },
  inputIcon: { fontSize: 16 },
  input: { flex: 1, fontSize: 15, color: COLORS.text },
  eyeBtn: { padding: 4 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16, height: 56,
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: '0 6px 12px rgba(255,107,53,0.35)' },
    }),
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 17, letterSpacing: 0.5 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.divider },
  dividerText: { color: COLORS.textLight, fontSize: 13, fontWeight: '600' },
  ghostBtn: {
    height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.primary,
  },
  ghostBtnText: { color: COLORS.primary, fontWeight: '800', fontSize: 16 },
  hint: {
    textAlign: 'center', color: COLORS.textLight, fontSize: 12,
    marginTop: 20, lineHeight: 18,
  },
});

export default LoginScreen;
