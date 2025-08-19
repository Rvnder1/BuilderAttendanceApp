import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import auth from '@react-native-firebase/auth';

const HomeScreen = ({ navigation }) => {
  const user = auth().currentUser; // Get current logged-in user

  const handleLogout = async () => {
    try {
      await auth().signOut();
      // No need to navigate - auth listener in App.js will handle redirect
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {user?.email || 'Builder'}!</Text>
      
      <View style={styles.buttonContainer}>
        <Button
          title="Scan QR Code"
          onPress={() => navigation.navigate('QrScanner')}
          color="#007AFF"
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button
          title="View Attendance History"
          onPress={() => navigation.navigate('AttendanceHistory')}
          color="#34C759" // Green color
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Logout"
          onPress={handleLogout}
          color="#FF3B30" // Red color for destructive action
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
    color: '#333',
  },
  buttonContainer: {
    marginVertical: 10,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  }
});

export default HomeScreen;