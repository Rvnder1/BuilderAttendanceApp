import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  Alert,
  RefreshControl,
  TouchableOpacity 
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export default function AttendanceHistory({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [sites, setSites] = useState({});

  // Fetch user's attendance records
  const fetchAttendanceHistory = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      const user = auth().currentUser;
      if (!user) return;

      // Get last 50 attendance records for current user
      const attendanceQuery = await firestore()
        .collection('attendance')
        .where('userId', '==', user.uid)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

      const records = attendanceQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setAttendanceRecords(records);

      // Fetch site names for the records
      const siteIds = [...new Set(records.map(record => record.siteId))];
      const sitePromises = siteIds.map(siteId =>
        firestore().collection('sites').doc(siteId).get()
      );

      const siteSnapshots = await Promise.all(sitePromises);
      const sitesData = {};
      
      siteSnapshots.forEach((snap, index) => {
        if (snap.exists) {
          sitesData[siteIds[index]] = snap.data();
        }
      });

      setSites(sitesData);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      Alert.alert('Error', 'Failed to load attendance history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchAttendanceHistory();
  }, []);

  // Pull-to-refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendanceHistory(false);
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const recordDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const timeStr = date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    if (recordDate.getTime() === today.getTime()) {
      return `Today, ${timeStr}`;
    } else if (recordDate.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
      return `Yesterday, ${timeStr}`;
    } else {
      return `${date.toLocaleDateString('en-IN')}, ${timeStr}`;
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'check-in': return '#4CAF50';
      case 'check-out': return '#FF9800';
      default: return '#757575';
    }
  };

  // Render individual attendance item
  const renderAttendanceItem = ({ item }) => {
    const site = sites[item.siteId];
    const siteName = site?.name || 'Unknown Site';

    return (
      <View style={styles.recordItem}>
        <View style={styles.recordHeader}>
          <Text style={styles.siteName}>{siteName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        
        <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
        
        <View style={styles.recordDetails}>
          <Text style={styles.detailText}>Site ID: {item.siteId}</Text>
          <Text style={styles.detailText}>Device: {item.device || 'Unknown'}</Text>
          {item.coords && (
            <Text style={styles.detailText}>
              Location: {item.coords.lat?.toFixed(4)}, {item.coords.lng?.toFixed(4)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No attendance records yet</Text>
      <Text style={styles.emptySubtext}>Scan a QR code at a site to record your first attendance</Text>
      <TouchableOpacity 
        style={styles.scanButton} 
        onPress={() => navigation.navigate('QrScanner')}
      >
        <Text style={styles.scanButtonText}>Scan QR Code</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading attendance history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={attendanceRecords}
        keyExtractor={(item) => item.id}
        renderItem={renderAttendanceItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={
          attendanceRecords.length === 0 ? styles.emptyContainer : styles.listContainer
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  recordItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  siteName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  timestamp: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  recordDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  detailText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
