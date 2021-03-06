import React, { useEffect, useState } from 'react';
import { StyleSheet, View} from 'react-native';
import * as Permissions from 'expo-permissions';
import { Map, SplashScreen, Dashboard } from './screens';
import Navigation from './navigations/Navigation';
import * as Font from 'expo-font';
import { AppLoading } from 'expo';
import { Provider } from 'react-redux';
import { store } from './brain/redux'
import { InitializeFirebase,firebase_get_nearest_map_coords } from './database/Firebase';

const  getFonts =()=> Font.loadAsync({
  'Teko' : require('./assets/fonts/Teko-Regular.ttf'),
  'Roboto' : require('./assets/fonts/Roboto-Medium.ttf'),
  'Roboto-Bold' : require('./assets/fonts/Roboto-Bold.ttf'),
  'Open-Sans' : require('./assets/fonts/OpenSans-Regular.ttf'),
  'Archivo-Bold' : require('./assets/fonts/Archivo-Bold.ttf'),
  'Arial-Bold' : require('./assets/fonts/arial.ttf'),
  'AverageSans-Regular' : require('./assets/fonts/AverageSans-Regular.ttf'),
});

export default function Main(){
  const [permission, askForPermission] = Permissions.usePermissions(Permissions.LOCATION, { ask: true });
  const [fontsLoaded, setFontsLoaded] = useState(false);
  useEffect(()=>{
    InitializeFirebase();
    if (!permission || permission.status !== 'granted') {
      askForPermission(); 
    }
  },[]);

 
  
  if(fontsLoaded){
    return(
    <Provider store={store}>  
      <Navigation/>
    </Provider>
    );
  } else {
    
    return (
      <AppLoading
        startAsync={getFonts}
        onFinish={()=>setFontsLoaded(true)}
      />
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  }
});