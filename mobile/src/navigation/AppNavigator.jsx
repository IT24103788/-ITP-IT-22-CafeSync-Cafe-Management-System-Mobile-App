import React, { useContext, useState, useEffect } from 'react';
import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import AdminNavigator from './AdminNavigator';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants/colors';
import SplashScreen from '../components/SplashScreen';

const AppNavigator = () => {
  const { user, loading, isAdmin } = useContext(AuthContext);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 5000); // 5 seconds
    return () => clearTimeout(timer);
  }, []);

  if (loading || showSplash) {
    return <SplashScreen />;
  }

  return (
    <NavigationIndependentTree>
      <NavigationContainer>
        {!user ? (
          <AuthNavigator />
        ) : isAdmin ? (
          <AdminNavigator />
        ) : (
          <CustomerNavigator />
        )}
      </NavigationContainer>
    </NavigationIndependentTree>
  );
};

export default AppNavigator;
