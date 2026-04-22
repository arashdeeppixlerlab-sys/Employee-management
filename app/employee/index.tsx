import React from 'react';
import { Redirect } from 'expo-router';

export default function EmployeeLegacyRoute() {
  return <Redirect href="/(tabs)/dashboard" />;
}
