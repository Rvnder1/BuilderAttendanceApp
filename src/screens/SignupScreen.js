import React, { useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import AuthForm from '../components/AuthForm';
import Button from '../components/Button';
import auth from '@react-native-firebase/auth';

const SignupScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const{email, password, confirmPassword}= formData;

  const handleSignup = async() => {
    console.log('Sign Up button pressed');

    if(!email || !password || !confirmPassword){
      Alert.alert('Error', 'Please fill all the fields');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)){
      Alert.alert('Error', 'Invalid email format');
      return;
    }
    if(password.length<6){
      Alert.alert('Error','Password must be at least 6 characters');
      return;
    }
    if (password!== confirmPassword){
      Alert.alert('Error','Password so not match');
      return;
    }
    if(loading) return;
    setLoading(true);

    try{
      await auth().createUserWithEmailAndPassword(email, password);
      Alert.alert('Success', 'Account Created!');
    }catch(error){
      let msg = 'Signup failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') msg = 'Email already in use.';
      if (error.code === 'auth/invalid-email') msg = 'Invalid email address.';
      if (error.code === 'auth/weak-password') msg = 'Password is too weak.';
      if (error.code === 'auth/operation-not-allowed') msg = 'Email/password accounts are disabled in Firebase console.';
      Alert.alert('Error', msg);
    }finally{
      setLoading(false);
    }
  };

  const fields = [
    { name: 'email', placeholder: 'Email', secure: false },
    { name: 'password', placeholder: 'Password', secure: true },
    { name: 'confirmPassword', placeholder: 'Confirm Password', secure: true }
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      
      <AuthForm 
        fields={fields}
        values={formData}
        onChange={(name, value) => setFormData({...formData, [name]: value})}
      />

      <Button 
        title="Sign Up" 
        onPress={handleSignup} 
        loading={loading}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#ffffff'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333333'
  },
  footerText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#666666'
  },
  footerLink: {
    color: '#1a73e8',
    fontWeight: '600'
  }
});

export default SignupScreen;