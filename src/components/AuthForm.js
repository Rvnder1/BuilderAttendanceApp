import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

const AuthForm = ({ fields, values, onChange }) => {
  return (
    <View style={styles.container}>
      {fields.map((field) => (
        <TextInput
          key={field.name}
          style={styles.input}
          placeholder={field.placeholder}
          value={values[field.name]}
          onChangeText={(text) => onChange(field.name, text)}
          secureTextEntry={field.secure}
          autoCapitalize="none"
          autoCorrect={false}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 25,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
});

export default AuthForm;