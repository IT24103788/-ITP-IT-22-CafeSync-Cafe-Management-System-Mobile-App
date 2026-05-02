import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/customer/HomeScreen';
import OrderScreen from '../screens/customer/OrderScreen';
import ReservationScreen from '../screens/customer/ReservationScreen';
import PaymentHistoryScreen from '../screens/customer/PaymentHistoryScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import SavedCardsScreen from '../screens/customer/SavedCardsScreen';
import { COLORS } from '../constants/colors';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_ICONS = {
  Home: { active: 'home', inactive: 'home-outline' },
  Orders: { active: 'receipt', inactive: 'receipt-outline' },
  Reservations: { active: 'calendar', inactive: 'calendar-outline' },
  Payments: { active: 'card', inactive: 'card-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

const TabIcon = ({ name, focused }) => {
  const isHome = name === 'Home';
  return (
    <View style={[
      styles.iconWrap,
      focused && styles.iconWrapActive,
      isHome && styles.iconWrapHome,
      isHome && focused && styles.iconWrapHomeActive,
    ]}>
      <Ionicons
        name={focused ? TAB_ICONS[name]?.active : TAB_ICONS[name]?.inactive}
        size={22}
        color={isHome ? (focused ? COLORS.white : COLORS.primary) : (focused ? COLORS.primary : COLORS.textLight)}
      />
    </View>
  );
};

const TabNavigator = () => (
  <Tab.Navigator
    initialRouteName="Home"
    sceneContainerStyle={{ backgroundColor: COLORS.background }}
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      tabBarLabel: ({ focused }) => (
        <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
          {route.name}
        </Text>
      ),
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarItemStyle: styles.tabItem,
      animation: 'shift',
      animationDuration: 1000,
    })}
  >
    <Tab.Screen name="Orders" component={OrderScreen} />
    <Tab.Screen name="Reservations" component={ReservationScreen} />
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Payments" component={PaymentHistoryScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const CustomerNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CustomerTabs" component={TabNavigator} />
    <Stack.Screen
      name="SavedCards"
      component={SavedCardsScreen}
      options={{ headerShown: false, animation: 'slide_from_right' }}
    />
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    height: Platform.OS === 'ios' ? 85 : 68,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
  },
  tabItem: { paddingTop: 4 },
  iconWrap: {
    width: 44, height: 36, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  iconWrapActive: { backgroundColor: COLORS.primary + '15' },
  iconWrapHome: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.surface,
    marginTop: -6,
    borderWidth: 3, borderColor: COLORS.background,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
      android: { elevation: 6 },
    })
  },
  iconWrapHomeActive: { backgroundColor: COLORS.primary, borderColor: COLORS.background },
  tabLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textLight },
  tabLabelActive: { color: COLORS.primary, fontWeight: '800' },
});

export default CustomerNavigator;
