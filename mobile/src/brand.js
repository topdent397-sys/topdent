import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import logoMark from '../assets/logo-mark.png';

export function BrandMark({ size = 46, light = false }) {
  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: size * 0.28 }, light && styles.light]}>
      <Image source={logoMark} resizeMode="contain" style={{ width: size * 0.78, height: size * 0.78 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', overflow: 'hidden' },
  light: { backgroundColor: '#eff6ff' }
});
