import React, { useEffect, useRef, useState, useContext } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  TextInput, ActivityIndicator, Platform, Animated,
  KeyboardAvoidingView, ScrollView, Dimensions, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { COLORS } from '../../constants/colors';

const { height } = Dimensions.get('window');

const Field = ({ label, icon, value, onChangeText, placeholder, secure, extra, showPass, setShowPass, setError }) => (
  <View style={{ marginBottom: 4 }}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputBox, value.length > 0 && styles.inputBoxActive]}>
      <Ionicons name={icon} size={18} color={value.length > 0 ? COLORS.accent : COLORS.textLight} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        value={value}
        onChangeText={v => { onChangeText(v); setError(''); }}
        secureTextEntry={secure && !showPass}
        autoCapitalize="none"
        autoCorrect={false}
        {...extra}
      />
      {secure && (
        <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
          <Image
            source={showPass ? require('../../../assets/images/eye_show.png') : require('../../../assets/images/eye_hide.png')}
            style={{ width: 20, height: 20, tintColor: COLORS.textLight }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const RegisterScreen = ({ navigation }) => {
  const { register } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirm || !mobile.trim() || !address.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(name.trim(), email.trim(), password, address.trim(), mobile.trim());
    } catch (e) {
      setError(e.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroCircle1} />
        <View style={styles.heroCircle2} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="arrow-back" size={16} color="rgba(255,255,255,0.85)" />
            <Text style={styles.backText}>Back</Text>
          </View>
        </TouchableOpacity>
        <Animated.View style={[styles.heroContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.heroIconBg}>
            <Ionicons name="person-add" size={38} color={COLORS.white} />
          </View>
          <Text style={styles.heroTitle}>Sign Up</Text>
          <Text style={styles.heroSub}>Join CafeSync today</Text>
        </Animated.View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={styles.errorBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            </View>
          ) : null}

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Field 
              label="Full Name" icon="person-outline" value={name} 
              onChangeText={setName} placeholder="Your Full Name" 
              extra={{ autoCapitalize: 'words' }} 
              setError={setError}
            />
            <Field 
              label="Email Address" icon="mail-outline" value={email} 
              onChangeText={setEmail} placeholder="Enter your Email" 
              extra={{ keyboardType: 'email-address' }} 
              setError={setError}
            />
            <Field 
              label="Password" icon="lock-closed-outline" value={password} 
              onChangeText={setPassword} placeholder="Enter your Password" 
              secure showPass={showPass} setShowPass={setShowPass} 
              setError={setError}
            />
            <Field 
              label="Confirm Password" icon="shield-checkmark-outline" value={confirm} 
              onChangeText={setConfirm} placeholder="Repeat password" 
              secure showPass={showPass} setShowPass={setShowPass} 
              setError={setError}
            />
            <Field 
              label="Mobile Number" icon="call-outline" value={mobile} 
              onChangeText={setMobile} placeholder="e.g. +94771234567" 
              extra={{ keyboardType: 'phone-pad' }} 
              setError={setError}
            />
            <Field 
              label="Home Address" icon="location-outline" value={address} 
              onChangeText={setAddress} placeholder="Enter your street address" 
              setError={setError}
            />
          </Animated.View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.primaryBtnText}>Create Account</Text>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.white} />
                </View>
              )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLinkText}>Already have an account? <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Sign In</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  hero: {
    backgroundColor: COLORS.accent,
    paddingTop: Platform.OS === 'android' ? 36 : 16,
    paddingBottom: 36,
    paddingHorizontal: 20,
    overflow: 'hidden',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  heroCircle1: {
    position: 'absolute', top: -30, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroCircle2: {
    position: 'absolute', bottom: -50, left: -20,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  backBtn: { marginBottom: 16 },
  backText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600' },
  heroContent: { alignItems: 'center' },
  heroIconBg: {
    width: 76, height: 76, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: { fontSize: 28, fontWeight: '900', color: COLORS.white },
  heroSub: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  form: { padding: 24, paddingTop: 24, paddingBottom: 40 },
  errorBanner: {
    backgroundColor: COLORS.dangerLight, borderWidth: 1,
    borderColor: COLORS.danger, borderRadius: 12,
    padding: 14, marginBottom: 12,
  },
  errorText: { color: COLORS.danger, fontSize: 13, fontWeight: '600' },
  label: {
    fontSize: 13, fontWeight: '700', color: COLORS.textMid,
    marginBottom: 7, marginTop: 14, letterSpacing: 0.3,
  },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 14,
    paddingHorizontal: 14, borderWidth: 1.5,
    borderColor: COLORS.divider, height: 52, gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.05)' },
    }),
  },
  inputBoxActive: { borderColor: COLORS.accent },
  inputIcon: { fontSize: 16 },
  input: { flex: 1, fontSize: 15, color: COLORS.text },
  eyeBtn: { padding: 4 },
  primaryBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 16, height: 56, marginTop: 24,
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: '0 6px 12px rgba(124,58,237,0.3)' },
    }),
  },
  primaryBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  loginLink: { alignItems: 'center', marginTop: 20 },
  loginLinkText: { fontSize: 14, color: COLORS.textLight },
});

export default RegisterScreen;
