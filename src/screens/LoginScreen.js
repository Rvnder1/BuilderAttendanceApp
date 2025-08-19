import React, { useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import AuthForm from '../components/AuthForm';
import Button from '../components/Button';
import auth from '@react-native-firebase/auth';

const LoginScreen = ({ navigation }) => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const {email, password}= credentials;

  const handleLogin = async () => {
    console.log('Login button pressed');
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fileds');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      Alert.alert('Error', 'Invalid email format');
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      await auth().signInWithEmailAndPassword(email, password);

    }
    catch (error) {
      let msg= 'Login failed. Please try again';
      if (error.code==='auth/user-not-found') msg ='No account found with this email.';
      if(error.code==='auth/wrong-password') msg='Incorrect password';
      if(error.code==='auth/invalid-email') msg='Invalid email address';

      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'email', placeholder: 'Email', secure: false },
    { name: 'password', placeholder: 'Password', secure: true }
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Builder Login</Text>

      <AuthForm
        fields={fields}
        values={credentials}
        onChange={(name, value) => setCredentials({ ...credentials, [name]: value })}
      />

      <Button
        title="Login"
        onPress={handleLogin}
        loading={loading}
      />

      <Pressable onPress={() => navigation.navigate('Signup')}>
        <Text style={styles.footerText}>
          Don't have an account? <Text style={styles.footerLink}>Sign up</Text>
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  footerText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#666',
  },
  footerLink: {
    color: '#1a73e8',
    fontWeight: '600',
  },
});

export default LoginScreen;