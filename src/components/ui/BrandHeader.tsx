import React from 'react';
import { View, Image, StyleSheet, Text, ImageSourcePropType } from 'react-native';

type Props = {
  title: string;
  subtitle?: string;
  logo?: ImageSourcePropType;
};

export default function BrandHeader({ title, subtitle, logo }: Props) {
  return (
    <View style={styles.wrapper} accessibilityRole="header">
      <View style={styles.row}>
        {logo && (
          <Image source={logo} style={styles.logo} resizeMode="contain" accessible />
        )}
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingVertical: 8, marginBottom: 8 },
  row: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  logo: { width: 120, height: 120, borderRadius: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  subtitle: { color: '#64748B', textAlign: 'center' },
});