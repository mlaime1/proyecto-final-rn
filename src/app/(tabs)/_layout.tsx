import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabIconProps = {
  name: React.ComponentProps<typeof Ionicons>['name'];
  focused: boolean;
};

function TabIcon({ name, focused }: TabIconProps) {
  return (
    <View style={styles.iconSlot}>
      <Ionicons name={name} size={23} color={focused ? '#4C1D95' : '#64748B'} />
      {focused && <View style={styles.activeIndicator} />}
    </View>
  );
}

export default function LayoutTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: '#4C1D95',
        tabBarInactiveTintColor: '#64748B',
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 8,
          marginVertical: 5,
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 2,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
          // La librería agrega paddingBottom: insets.bottom por su cuenta;
          // acá solo compensamos la altura para que el contenido no se aplaste.
          height: 64 + Math.max(insets.bottom, 4),
          paddingHorizontal: 8,
          paddingTop: 5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Ir al inicio',
          tabBarIcon: ({ focused }) => <TabIcon name="home-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="turnos"
        options={{
          title: 'Turnos',
          href: '/(tabs)/turnos',
          tabBarAccessibilityLabel: 'Ver turnos',
          tabBarItemStyle: [styles.tabBarItem, styles.turnosTabItem],
          tabBarIcon: ({ focused }) => <TabIcon name="calendar-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarAccessibilityLabel: 'Abrir perfil',
          tabBarIcon: ({ focused }) => <TabIcon name="person-outline" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconSlot: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabBarItem: {
    borderRadius: 16,
    marginHorizontal: 8,
    marginVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnosTabItem: {
    transform: [{ translateY: 0 }],
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -2,
    width: 16,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#4C1D95',
  },
});
