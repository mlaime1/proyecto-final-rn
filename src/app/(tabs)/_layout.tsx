import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LayoutTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveBackgroundColor: '#EDE9FE',
        tabBarActiveTintColor: '#4C1D95',
        tabBarInactiveTintColor: '#6B7280',
        tabBarItemStyle: {
          borderRadius: 18,
          marginHorizontal: 6,
          marginVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '700',
          marginBottom: 2,
        },
        tabBarStyle: {
          backgroundColor: '#FFF7ED',
          borderTopColor: '#E5E7EB',
          // La librería agrega paddingBottom: insets.bottom por su cuenta;
          // acá solo compensamos la altura para que el contenido no se aplaste.
          height: 64 + Math.max(insets.bottom, 4),
          paddingHorizontal: 12,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="turnos"
        options={{
          title: 'Turnos',
          href: '/(tabs)/turnos',
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialIcons name={focused ? 'event' : 'event-note'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, focused, size }) => (
            <MaterialIcons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
