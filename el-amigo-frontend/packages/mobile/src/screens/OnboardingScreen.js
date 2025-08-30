// /src/screens/OnboardingScreen.js

import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated } from 'react-native';

const slides = [
  {
    key: 'one',
    title: 'Bienvenido a Unicorn Finalmente',
    text: 'La app donde tus finanzas se vuelven adictivas, seguras y ultra simples.',
    image: require('../assets/onboarding1.png'),
  },
  {
    key: 'two',
    title: '100% Seguro y Transparente',
    text: 'Tus datos y tu dinero siempre protegidos. Sin letras chicas.',
    image: require('../assets/onboarding2.png'),
  },
  {
    key: 'three',
    title: 'Empieza tu viaje unicornio',
    text: 'Crea tu cuenta en segundos. Siente la diferencia.',
    image: require('../assets/onboarding3.png'),
  },
];

export default function OnboardingScreen({ navigation }) {
  const [current, setCurrent] = useState(0);
  const fadeAnim = new Animated.Value(1);

  const next = () => {
    if (current < slides.length - 1) {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setCurrent(current + 1);
        fadeAnim.setValue(1);
      });
    } else {
      navigation.replace('Home');
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <Image source={slides[current].image} style={styles.image} resizeMode="contain" />
        <Text style={styles.title}>{slides[current].title}</Text>
        <Text style={styles.text}>{slides[current].text}</Text>
        <TouchableOpacity style={styles.button} onPress={next}>
          <Text style={styles.buttonText}>
            {current < slides.length - 1 ? 'Siguiente' : 'Empezar'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, current === i && styles.activeDot]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0033', justifyContent: 'center', alignItems: 'center', padding: 20 },
  image: { width: 220, height: 220, marginBottom: 32 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 14 },
  text: { color: '#bcbcbc', fontSize: 18, textAlign: 'center', marginBottom: 32 },
  button: { backgroundColor: '#ff31b9', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 40, marginBottom: 18 },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: '600' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3d204e', margin: 5 },
  activeDot: { backgroundColor: '#ff31b9', width: 16, height: 10, borderRadius: 8 },
});
