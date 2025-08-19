import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ToastAndroid, Alert, Text, Platform, PermissionsAndroid } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import Geolocation from 'react-native-geolocation-service';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';


const haversine = (lat1, lon1, lat2, lon2) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function QrScanner({ navigation }) {
  const cameraRef = useRef(null);
  const [isActive, setIsActive] = useState(true);
  const [processing, setProcessing] = useState(false);
  const device = useCameraDevice('back');

  const requestLocationPermission = useCallback(async () => {
    if (Platform.OS === 'ios') {
      const result = await Geolocation.requestAuthorization('whenInUse');
      return result === 'granted';
    } else {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location for geofencing.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Location permission error:', err);
        return false;
      }
    }
  }, []);

  /**
   * Request permissions on-demand right before we need them.
   */
  const ensurePermissions = useCallback(async () => {
    // Camera permission (VisionCamera handles this cross-platform)
    const camStatus = await Camera.getCameraPermissionStatus();
    if (camStatus !== 'granted') {
      const camReq = await Camera.requestCameraPermission();
      if (camReq !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is required to scan codes.');
        return false;
      }
    }

    // Location permission (platform-specific)
    const locGranted = await requestLocationPermission();
    if (!locGranted) {
      Alert.alert('Permission required', 'Location permission is required for geofencing.');
      return false;
    }

    return true;
  }, [requestLocationPermission]);
  
  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    });
  }, []);

  /**
   * Main handler after a QR/barcode is scanned.
   */
  const handleScannedValue = useCallback(async (scannedValue) => {
    if (processing) return;
    setProcessing(true);

    try {
      // 1) Permissions
      const ok = await ensurePermissions();
      if (!ok) {
        setProcessing(false);
        return;
      }

      // 2) Parse siteId
      let siteId = '';
      try {
        siteId = JSON.parse(scannedValue)?.siteId || '';
      } catch {
        if (typeof scannedValue === 'string' && scannedValue.startsWith('site:')) {
          siteId = scannedValue.replace('site:', '');
        }
      }
      if (!siteId) {
        Alert.alert('Invalid QR', 'This QR code is not recognized.');
        setProcessing(false);
        return;
      }

      // 3) Auth check
      const user = auth().currentUser;
      if (!user) {
        Alert.alert('Error', 'You are not signed in.');
        setProcessing(false);
        return;
      }

      // 4) Get location
      const location = await getCurrentLocation();
      const { latitude, longitude } = location.coords;

      // 5) Fetch site
      const siteSnap = await firestore().collection('sites').doc(siteId).get();
      if (!siteSnap.exists) {
        Alert.alert('Error', 'No site found for this QR.');
        setProcessing(false);
        return;
      }

      const site = siteSnap.data() || {};
      const siteLat = site?.location?.lat;
      const siteLng = site?.location?.lng;
      const radius =
        typeof site?.geofenceRadiusMeters === 'number' ? site.geofenceRadiusMeters : 150;

      if (typeof siteLat !== 'number' || typeof siteLng !== 'number') {
        Alert.alert('Error', 'Site is misconfigured: missing location.');
        setProcessing(false);
        return;
      }

      // 6) Geofence check
      const distance = haversine(latitude, longitude, siteLat, siteLng);
      if (distance > radius) {
        Alert.alert('Out of range', `You are too far from this site. (${Math.round(distance)}m away)`);
        setProcessing(false);
        return;
      }

      // 7) Write attendance
      await firestore().collection('attendance').add({
        userId: user.uid,
        userEmail: user.email || null,
        siteId,
        status: 'check-in',
        device: 'mobile',
        timestamp: firestore.FieldValue.serverTimestamp(),
        clientTimestamp: new Date().toISOString(),
        coords: { lat: latitude, lng: longitude },
      });

      ToastAndroid.showWithGravity('Attendance recorded', ToastAndroid.SHORT, ToastAndroid.CENTER);
      navigation.goBack();
    } catch (err) {
      console.error('Scan flow error:', err);
      Alert.alert('Error', 'Failed to process scan');
      setProcessing(false);
    }
  }, [ensurePermissions, getCurrentLocation, navigation, processing]);

  /**
   * VisionCamera code scanner configuration
   */
  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'],
    onCodeScanned: (codes) => {
      if (!isActive || processing) return;
      if (!codes || !codes.length) return;

      const scannedValue = codes[0]?.value ?? '';
      if (!scannedValue) return;

      // Show immediate feedback
      ToastAndroid.showWithGravity(
        `Scanned: ${scannedValue}`,
        ToastAndroid.SHORT,
        ToastAndroid.CENTER
      );

      // Debounce: pause scanning to avoid multiple reads
      setIsActive(false);
      handleScannedValue(scannedValue).finally(() => {
        // If navigation.goBack() didn't happen (e.g., error), re-enable after a short delay
        setTimeout(() => setIsActive(true), 1500);
      });
    },
  });

  if (device == null) {
    return (
      <View style={styles.noCameraView}>
        <Text>Camera device not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive && !processing}
        codeScanner={codeScanner}
      />

      <View style={styles.overlay}>
        {/* Optional: draw a frame to guide user */}
        <View style={styles.qrFrame} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  noCameraView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  qrFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
});
