import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { EmployeeService, Employee } from '../../src/services/EmployeeService';
import { AdminUserManagementService } from '../../src/services/AdminUserManagementService';
import AuthGuard from '../../src/components/AuthGuard';
import { confirmAction } from '../../src/utils/confirmAction';

export default function AdminEmployees() {
  type RowActionType = 'block' | 'delete';
  type BulkActionType = 'block' | 'unblock' | 'delete';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [pendingRowAction, setPendingRowAction] = useState<{ userId: string; type: RowActionType } | null>(null);
  const [pendingBulkAction, setPendingBulkAction] = useState<BulkActionType | null>(null);
  const router = useRouter();

  const fetchEmployees = async () => {
    try {
      const employeeData = await EmployeeService.fetchEmployees();
      setEmployees(employeeData);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEmployees();
  };

  const handleEmployeePress = (employee: Employee) => {
    router.push(`/(admin-tabs)/employee-details?id=${employee.id}`);
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(admin-tabs)/dashboard');
  };

  const handleEmployeeCardPress = (employee: Employee) => {
    if (selectionMode) {
      toggleSelect(employee.id);
      return;
    }
    handleEmployeePress(employee);
  };

  const handleEmployeeCardLongPress = (employee: Employee) => {
    if (!selectionMode) {
      setSelectionMode(true);
    }
    toggleSelect(employee.id);
  };

  const handleBlockToggle = async (employee: Employee) => {
    const isBlocked = !!employee.is_blocked;
    const confirmTitle = isBlocked ? 'Unblock User' : 'Block User';
    const confirmMessage = isBlocked
      ? `Unblock ${employee.email}?`
      : `Block ${employee.email}?`;
    const confirmed = await confirmAction({
      title: confirmTitle,
      message: confirmMessage,
      confirmText: isBlocked ? 'Unblock' : 'Block',
    });

    if (!confirmed) return;

    setPendingRowAction({ userId: employee.id, type: 'block' });
    let result;
    try {
      result = isBlocked
        ? await AdminUserManagementService.unblockUser(employee.id)
        : await AdminUserManagementService.blockUser(employee.id);
    } finally {
      setPendingRowAction((prev) =>
        prev?.userId === employee.id && prev.type === 'block' ? null : prev
      );
    }

    if (!result.success) {
      Alert.alert(isBlocked ? 'Unblock Failed' : 'Block Failed', result.error || 'Please try again.');
      return;
    }

    Alert.alert('Success', isBlocked ? 'User unblocked.' : 'User blocked.');
    fetchEmployees();
  };

  const handleDeleteUser = async (employee: Employee) => {
    const confirmed = await confirmAction({
      title: 'Delete User',
      message: `Permanently delete ${employee.email}? This cannot be undone.`,
      confirmText: 'Delete',
    });
    if (!confirmed) return;

    setPendingRowAction({ userId: employee.id, type: 'delete' });
    let result;
    try {
      result = await AdminUserManagementService.deleteUser(employee.id);
    } finally {
      setPendingRowAction((prev) =>
        prev?.userId === employee.id && prev.type === 'delete' ? null : prev
      );
    }

    if (!result.success) {
      Alert.alert('Delete Failed', result.error || 'Please try again.');
      return;
    }

    Alert.alert('Success', 'User deleted permanently.');
    setSelectedUserIds((prev) => prev.filter((id) => id !== employee.id));
    fetchEmployees();
  };

  const toggleSelect = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const clearSelection = () => {
    setSelectedUserIds([]);
    setSelectionMode(false);
  };

  const selectedEmployees = employees.filter((employee) => selectedUserIds.includes(employee.id));
  const hasBlockedSelected = selectedEmployees.some((employee) => !!employee.is_blocked);
  const hasUnblockedSelected = selectedEmployees.some((employee) => !employee.is_blocked);

  const handleBulkAction = async (type: BulkActionType) => {
    if (!selectedEmployees.length) return;

    const targetUsers =
      type === 'block'
        ? selectedEmployees.filter((employee) => !employee.is_blocked)
        : type === 'unblock'
          ? selectedEmployees.filter((employee) => !!employee.is_blocked)
          : selectedEmployees;

    if (!targetUsers.length) {
      Alert.alert('No matching users', `No users available for ${type}.`);
      return;
    }

    setPendingBulkAction(type);
    let successCount = 0;
    let failedCount = 0;

    try {
      for (const user of targetUsers) {
        const result =
          type === 'block'
            ? await AdminUserManagementService.blockUser(user.id)
            : type === 'unblock'
              ? await AdminUserManagementService.unblockUser(user.id)
              : await AdminUserManagementService.deleteUser(user.id);

        if (result.success) successCount += 1;
        else failedCount += 1;
      }
    } finally {
      setPendingBulkAction(null);
    }
    fetchEmployees();
    setSelectedUserIds([]);
    setSelectionMode(false);

    const skippedCount = selectedEmployees.length - targetUsers.length;

    Alert.alert(
      'Bulk Action Complete',
      `${successCount} user(s) updated.${failedCount ? ` ${failedCount} failed.` : ''}${skippedCount ? ` ${skippedCount} skipped.` : ''}`
    );
  };

  const confirmBulkAction = async (type: BulkActionType) => {
    if (!selectedUserIds.length) return;

    const actionLabel = type === 'delete' ? 'Delete' : type === 'block' ? 'Block' : 'Unblock';
    const confirmed = await confirmAction({
      title: `${actionLabel} Selected Users`,
      message: `${actionLabel} ${selectedUserIds.length} selected user(s)?${type === 'delete' ? ' This cannot be undone.' : ''}`,
      confirmText: actionLabel,
    });

    if (!confirmed) return;
    await handleBulkAction(type);
  };

  const renderEmployeeItem = ({ item }: { item: Employee }) => (
    <TouchableOpacity
      style={[styles.employeeCard, selectedUserIds.includes(item.id) && styles.employeeCardSelected]}
      onPress={() => handleEmployeeCardPress(item)}
      onLongPress={() => handleEmployeeCardLongPress(item)}
      activeOpacity={0.8}
    >
      {selectionMode ? (
        <View style={[styles.selectButton, selectedUserIds.includes(item.id) && styles.selectButtonActive]}>
          {selectedUserIds.includes(item.id) && <Text style={styles.selectButtonText}>✓</Text>}
        </View>
      ) : (
        item.profile_photo_url ? (
          <Image source={{ uri: item.profile_photo_url }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{(item.name || item.email || 'U').charAt(0).toUpperCase()}</Text>
          </View>
        )
      )}
      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>{item.name || item.email}</Text>
        <Text style={styles.employeeEmail}>{item.email}</Text>
        <Text style={[styles.statusBadge, item.is_blocked ? styles.blockedBadge : styles.activeBadge]}>
          {item.is_blocked ? 'Blocked' : 'Active'}
        </Text>
      </View>
      {selectionMode ? (
        <Ionicons name="checkmark-circle-outline" size={20} color="#94a3b8" />
      ) : (
        <View style={styles.actionsColumn}>
          {(() => {
            const rowBusy = pendingRowAction?.userId === item.id;
            const isBlockPending = rowBusy && pendingRowAction?.type === 'block';
            const isDeletePending = rowBusy && pendingRowAction?.type === 'delete';

            return (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.blockButton]}
                  onPress={() => handleBlockToggle(item)}
                  disabled={rowBusy}
                >
                  <Text style={styles.actionButtonText}>
                    {isBlockPending ? '...' : item.is_blocked ? 'Unblock' : 'Block'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteUser(item)}
                  disabled={rowBusy}
                >
                  <Text style={styles.actionButtonText}>
                    {isDeletePending ? '...' : 'Delete'}
                  </Text>
                </TouchableOpacity>
              </>
            );
          })()}
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <AuthGuard requiredRole="admin">
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading employees...</Text>
          </View>
        </SafeAreaView>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole="admin">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.titleRow}>
            <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
              <Ionicons name="chevron-back" size={22} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.title}>Employees</Text>
            <TouchableOpacity
              style={styles.multiSelectButton}
              onPress={() => {
                if (selectionMode) {
                  clearSelection();
                } else {
                  setSelectionMode(true);
                }
              }}
            >
              <Text style={styles.multiSelectButtonText}>{selectionMode ? 'Done' : 'Multi Select'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.listHeader}>
            <Text style={styles.listSubtitle}>
              {selectionMode
                ? 'Tap users to select. Long press also works.'
                : 'Tap user for details. Long press for multi-select.'}
            </Text>
            <TouchableOpacity style={styles.addUserButton} onPress={() => router.push('/(admin-tabs)/add-user')}>
              <Text style={styles.addUserButtonText}>Add User</Text>
            </TouchableOpacity>
          </View>
          {selectionMode && (
            <View style={styles.bulkBar}>
              <Text style={styles.bulkText}>{selectedUserIds.length} selected</Text>
              <View style={styles.bulkActions}>
                {hasUnblockedSelected && (
                  <TouchableOpacity
                    style={[styles.bulkButton, styles.bulkBlockButton]}
                    onPress={() => confirmBulkAction('block')}
                    disabled={pendingBulkAction !== null || !selectedUserIds.length}
                  >
                    <Text style={styles.bulkButtonText}>{pendingBulkAction === 'block' ? '...' : 'Block'}</Text>
                  </TouchableOpacity>
                )}
                {hasBlockedSelected && (
                  <TouchableOpacity
                    style={[styles.bulkButton, styles.bulkUnblockButton]}
                    onPress={() => confirmBulkAction('unblock')}
                    disabled={pendingBulkAction !== null || !selectedUserIds.length}
                  >
                    <Text style={styles.bulkButtonText}>{pendingBulkAction === 'unblock' ? '...' : 'Unblock'}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.bulkButton, styles.bulkDeleteButton]}
                  onPress={() => confirmBulkAction('delete')}
                  disabled={pendingBulkAction !== null || !selectedUserIds.length}
                >
                  <Text style={styles.bulkButtonText}>{pendingBulkAction === 'delete' ? '...' : 'Delete'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bulkClearButton} onPress={clearSelection} disabled={pendingBulkAction !== null}>
                  <Text style={styles.bulkClearText}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <FlatList
            data={employees}
            renderItem={renderEmployeeItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No employees found</Text>
              </View>
            }
          />
        </View>
      </SafeAreaView>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  container: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    gap: 10,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111111',
    flex: 1,
  },
  multiSelectButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  multiSelectButtonText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '600',
  },
  listHeader: {
    marginHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  listSubtitle: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
  },
  addUserButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  addUserButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  bulkBar: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#ffffff',
  },
  bulkText: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '600',
  },
  bulkActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  bulkButton: {
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  bulkBlockButton: {
    backgroundColor: '#d97706',
  },
  bulkUnblockButton: {
    backgroundColor: '#2563eb',
  },
  bulkDeleteButton: {
    backgroundColor: '#dc2626',
  },
  bulkButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  bulkClearButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  bulkClearText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  employeeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  employeeCardSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  employeeInfo: {
    flex: 1,
    marginRight: 12,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  selectButton: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#ffffff',
  },
  selectButtonActive: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  selectButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 4,
  },
  employeeEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  blockedBadge: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  actionsColumn: {
    gap: 8,
    alignItems: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  blockButton: {
    backgroundColor: '#f59e0b',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
});
