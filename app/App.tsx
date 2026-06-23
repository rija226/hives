import 'react-native-gesture-handler';
import { View, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Lato_400Regular, Lato_700Bold, Lato_300Light } from '@expo-google-fonts/lato';
import { HiveListScreen } from './screens/HiveListScreen';
import { HiveDetailScreen } from './screens/HiveDetailScreen';
import { StatsScreen } from './screens/StatsScreen';
import { DiaryScreen } from './screens/DiaryScreen';
import { colors, fonts } from './lib/theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [fontsLoaded] = useFonts({
    Lato_400Regular,
    Lato_700Bold,
    Lato_300Light,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }}>
        <ActivityIndicator color={colors.honey} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.charcoal,
          headerTitleStyle: { fontSize: 18, fontWeight: '600' },
          contentStyle: { backgroundColor: colors.muted },
        }}
      >
        <Stack.Screen
          name="HiveList"
          component={HiveListScreen}
          options={({ navigation }) => ({
            title: 'Pcelinjak',
            headerRight: () => (
              <View style={{ flexDirection: 'row', gap: 16, marginRight: 4 }}>
                <TouchableOpacity onPress={() => navigation.navigate('Diary')}>
                  <Text style={{ color: colors.honey, fontSize: 15, fontFamily: fonts.bodyBold }}>Dnevnik</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Stats')}>
                  <Text style={{ color: colors.honey, fontSize: 15, fontFamily: fonts.bodyBold }}>Statistika</Text>
                </TouchableOpacity>
              </View>
            ),
          })}
        />
        <Stack.Screen
          name="HiveDetail"
          component={HiveDetailScreen}
          options={({ route }) => ({ title: `Košnica ${route.params.hiveNumber}` })}
        />
        <Stack.Screen
          name="Stats"
          component={StatsScreen}
          options={{ title: `Statistika ${new Date().getFullYear()}` }}
        />
        <Stack.Screen
          name="Diary"
          component={DiaryScreen}
          options={{ title: 'Dnevnik pcelinjaka' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>
  );
}
