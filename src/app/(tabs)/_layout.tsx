import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';



export default function LayoutTabs() {
  return (
      <Tabs screenOptions={{ tabBarActiveTintColor:'#000' }}>
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({color,size})=><Ionicons name='home-outline' size={size} color={color}/> }} />
        <Tabs.Screen name="movies" options={{ title: 'Movies', headerShown: false, tabBarIcon: ({color,size})=><MaterialIcons name='movie' size={size} color={color}/>  }} />
        <Tabs.Screen name="categories" options={{ title: 'Categories', headerShown: false, tabBarIcon: ({color,size})=><MaterialIcons name='category' size={size} color={color}/> }} />
      </Tabs>
  );
}
