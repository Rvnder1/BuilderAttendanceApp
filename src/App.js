import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';

// Screens
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import HomeScreen from './screens/HomeScreen';
import QrScanner from './screens/QrScanner';
import AttendanceHistory from './screens/AttendanceHistory';

// Splash Loader Component
const SplashScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" />
    <Text>Loading...</Text>
  </View>
);

const Stack = createNativeStackNavigator();

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  // Auth state change listener
  useEffect(() => {
    console.log('Setting up auth listener...');
    const unsubscribe = auth().onAuthStateChanged(currentUser => {
      console.log(
        'onAuthStateChanged fired. user =',
        currentUser ? currentUser.uid : 'null'
      );
      setUser(currentUser);
      setInitializing(false); // This ensures splash screen hides
    });

    // Cleanup on unmount
    return unsubscribe;
  }, []); // Run only once on mount

  // Show splash while initializing
  if (initializing) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="QrScanner"
              component={QrScanner}
              options={{
                headerShown: true,
                title: 'Scan QR',
              }}
            />
             <Stack.Screen
              name="AttendanceHistory"
              component={AttendanceHistory}
              options={{
                headerShown: true,
                title: 'Attendance History',
                headerStyle: { backgroundColor: '#007AFF' },
                headerTitleStyle: { color: '#fff' },
                headerTintColor: '#fff',
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
        
      </Stack.Navigator>
    </NavigationContainer>
  );
}
