import React,{ useEffect, useRef, useState } from "react";
import { Animated, StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import {api, compass} from "../brain";
import {Mark, AnimatedLine, Text, View, Pic, List} from '../components';
import {theme} from '../constants';
import { firebase_get_nearest_map_coords } from "../database/Firebase";
import moment from 'moment';
import { direct_images, direct_text, readable_time } from "../constants/theme";

const CARD_HEIGHT = 220;
const CARD_WIDTH = theme.size.width * 0.8;
let start = false;
let current_index = -1;
let user_pos = {latitude: 0, longitude: 0};
let latest_coords = {latitude: 0, longitude: 0};
let map_pos = {
    latitude: 0, 
    longitude: 0,
    latitudeDelta: 0.0035,
    longitudeDelta: 0.0010
};




const top_shadow = {
  height: theme.size.height *.19,
  width: theme.size.width * .9,
  color:"#000",
  border:5,
  radius: 20,
  opacity:0.05,
  x: 0,
  y: 3,
}

const bottom_shadow = {
  height: theme.size.height *.12,
  width: theme.size.width * .8,
  color:"#000",
  border:5,
  radius: 30,
  opacity:0.05,
  x: 0,
  y: 3,
  style: {
    bottom: theme.size.height * .20, position: 'absolute'
  }
}


let compass_ = true;
function Main(){
    const [subscription, setSubscription] = useState(null);
    const [refresh, setRefresh] = useState(true);
    const [places , setPlaces] = useState([]);
    const [isdirection, setIsDirection] = useState(false);
    
    interface RoutesInterface{
      total_distance: number,
      duration: number,
      steps: {latitude: number, longitude: number}[],
      maneuver: {
        type: string,
        modifier: string,
      }[],
    }

    const [direction, setDirection] = useState< RoutesInterface>({
      total_distance: 0,
      duration: 0,
      steps: [],
      maneuver: [],
    });

    const rotateAnim = useRef(new Animated.Value(0)).current;
    const rootViewAnim = useRef(new Animated.Value(0)).current;

    const _map = useRef(null);
    useEffect(()=>{
      if(direction.steps.length != 0){
        setIsDirection(true);
      }
    },[direction])
    
    useEffect(()=>{
        GetLocation({refresh, setRefresh});
        if(compass_){

            compass.start( (result : any) =>{
            const { heading } = result;
            rotateAnim.setValue(heading);
            },{subscription, setSubscription});
        
            return () => {
            compass.remove({subscription, setSubscription});
            };
        }
    },[]);


    if(places.length == 0){
      GetNeareastHospital(100, setPlaces)
    }
    
    
    if(!start){
        return(
        <View center middle>
            <Text>Loading Screen</Text>
        </View>
        )
    }

    return(
        <View flex={false}>
        <MapView
        ref={_map}
        provider={PROVIDER_GOOGLE}
        style={styles.mapStyle}
        initialRegion={map_pos}
        customMapStyle={theme.mapStyle}
        onRegionChange={() => {
          _map.current.getCamera()
          .then((info) => {

          let angle = info.heading  
          rootViewAnim.setValue(angle);
          compass_ = false;
          });
          }}
        >
            <User rotateAnim={rotateAnim} rootViewAnim={rootViewAnim}/>
            <Direction route={direction.steps}/>

            {places.map(
                    (item, index) => <Places key={index} index={index} item={item} state={{setDirection}} />
            )}
            
        </MapView>
       {isdirection ? <ShowDirection state={{setIsDirection, setDirection}} direction={direction}/> : null} 

          
        
        </View>
       
    );
}


function ShowDirection(props){
  const { state, direction} = props;
  const { setIsDirection, setDirection} = state;
  const { duration, maneuver } = direction;
  const [select,setSelect] = useState(-1);

  interface RoutesInterface{
    total_distance: number,
    duration: number,
    steps: {latitude: number, longitude: number}[],
    maneuver: {
      name: string,
      type: string,
      bearing_after: number,
      modifier: string,
      distance: number,
    }[],
  }

  const TopViewItem =(props)=>{
    const{ item, index} = props;
    const { name, type, bearing_after, modifier, distance } = item;
    /*
    [
                  {direction: 'Head east onto Sto. Nino St', image: require('../assets/direction_icons/east.png'), distance: '20 km'},
                  {direction: 'Turn right onto Blue St', image: require('../assets/direction_icons/right.png'), distance: '20 km'}
    ]*/
              
    return(
      <View row middle center>
        <Pic
          src={direct_images(type,bearing_after,modifier)}
          style={{height: 15, width: 15}}
          resizeMode='contain'
        />
        <Text roboto size={ index == 0 ? 16 : 15} color={ index != 0 ? '#9F9F9F' : '#343434'}>{direct_text(name,type,modifier, bearing_after)}</Text>
        <Text roboto size={12} color='#6473FF'>  {distance} m</Text>
      </View>
    )
  }
  useEffect(()=>{
    switch(select){
      case 0:
        api.route_foot((result: RoutesInterface)=>{
          setDirection({
            steps: result.steps,
            total_distance: result.total_distance,
            duration: result.duration,
            maneuver: result.maneuver,
          })
          },{ 
          fromCoordinates : {longitude: user_pos.longitude, latitude: user_pos.latitude}, 
          toCoordinates : {longitude: latest_coords.longitude, latitude: latest_coords.latitude} 
        })
        break;
      case 1:
        api.route_car((result: RoutesInterface)=>{
          setDirection({
            steps: result.steps,
            total_distance: result.total_distance,
            duration: result.duration,
            maneuver: result.maneuver,
          })
          },{ 
          fromCoordinates : {longitude: user_pos.longitude, latitude: user_pos.latitude}, 
          toCoordinates : {longitude: latest_coords.longitude, latitude: latest_coords.latitude} 
        })
        break;
      case 2:
      api.route_bike((result: RoutesInterface)=>{
        setDirection({
          steps: result.steps,
          total_distance: result.total_distance,
          duration: result.duration,
          maneuver: result.maneuver,
        })
        },{ 
        fromCoordinates : {longitude: user_pos.longitude, latitude: user_pos.latitude}, 
        toCoordinates : {longitude: latest_coords.longitude, latitude: latest_coords.latitude} 
      })
      break;
    }
  }, [select])

  return(
    
    <View absolute style={styles.show_direction} paddingTop={theme.size.padding*5} middle> 
      
      <View shadow={top_shadow}>
          <View style={styles.top_view} middle paddingVertical={theme.size.padding * 2}>
            <View flex={false} absolute right={0}> 
            <View touchable style={{padding: 13}} press={()=>setIsDirection(false)}>
              <Pic
                src={require('../assets/icons/close_gray.png')}
              />
            </View>
             
            </View>
            <Pic
              src={require('../assets/icons/map_nav_dir.png')}
              marginBottom={5}
            />
            <Text roboto color='#6C6C6C' size={14} style={{marginBottom: theme.size.margin * 3}}>{readable_time(duration)}</Text>

            <List
              data={maneuver}
              renderItem={({item,index})=><TopViewItem item={item} index={index}/>}
              keyExtractor={(item,index)=> index.toString()}
            />
            
          </View>
      </View>
      
      
      
      <View flex={false} row style={{alignSelf: 'flex-start', marginLeft: theme.size.margin * 4, marginTop: theme.size.margin*2}}>
        <View flex={false} center middle touchable style={{height: 50, width: 50, backgroundColor:select == 0 ? '#678FF5': 'white', borderRadius: 10, marginRight: 8}}
           press={()=>setSelect(0)}
        >
        
           <Pic src={require('../assets/icons/bike.png')} />
        </View>
        <View flex={false} center middle touchable style={{height: 50, width: 50, backgroundColor: select == 1 ? '#678FF5': 'white', borderRadius: 10, marginRight: 8}}
         press={()=>setSelect(1)}
        >
           <Pic src={require('../assets/icons/car.png')} />
        </View>
        <View flex={false} center middle touchable style={{height: 50, width: 50, backgroundColor: select == 2 ? '#678FF5': 'white', borderRadius: 10, marginRight: 8}}
         press={()=>setSelect(2)}
        >
        
           <Pic src={require('../assets/icons/walk.png')} />
        </View>
      </View>


      <View shadow={bottom_shadow}>
          <View style={styles.bottom_view} middle center paddingHorizontal={5}>
            <Text robot_bold size={17} color='#545454'>Philippine General Hospital</Text>
            <Text robot_bold size={14} color='#9F9F9F' center>Taft Ave, Ermita, 1000 Metro Manila</Text>
          </View>
      </View>
    </View>
  );
}

function User(props){
    const {rotateAnim, rootViewAnim} = props;
    return(
        <Mark
        user
        animated
        coordinate={user_pos}
        image={require('../assets/icons/User.png')}
        rootViewStyle={{
          transform: [{
            rotate: rootViewAnim.interpolate({
                inputRange: [0,360],
                outputRange: ['360deg','0deg'],
                extrapolate: 'clamp',
            })
            }]
        }}
        viewStyle={{ transform: [{
          rotate: rotateAnim.interpolate({
              inputRange: [0,360],
              outputRange: ['0deg','360deg'],
              extrapolate: 'clamp',
          })
          }]}}
        imageStyle={{
            resizeMode:'contain',
            width: 80,
            height: 80,   
           }}
        />
    )
}

function Places(props){
    const { item, state} = props;
    const { geopoint } = item.position
    const { distance } = item.hitMetadata
    let dis = distance.toFixed(0) != 0 ? distance.toFixed(1) + ' km': (distance.toFixed(3) * 1000) + ' m'
    return(
        <Mark 
              coordinate={{latitude: geopoint.U, longitude: geopoint.k}}
              userPosition={{longitude: user_pos.longitude, latitude: user_pos.latitude}}
              image={require('../assets/icons/marker.png')}
              latest_coords={latest_coords}
              distance={dis}
              availability={item.availability}
              state={state}
              />
    );
}

function Direction(props){
    const { route } = props;
    
    return(
        <AnimatedLine
            coordinates={route}
            time={50}
          />
    );
}

function GetLocation(props){
    const { setRefresh, refresh } = props;

    navigator.geolocation.getCurrentPosition(
        position => {
          const {latitude, longitude} = position.coords;
            
          map_pos = {
            ...map_pos,
            longitude,
            latitude,
            }
            
            user_pos = {
            longitude,
            latitude,
            }
        
            start = true;
            setRefresh(!refresh);
          },
        error => alert(error.message),
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 1000 }
      )
        
}

function GetNeareastHospital(radius, setPlaces){
  if(user_pos.latitude != user_pos.longitude)
    firebase_get_nearest_map_coords((hits)=>{
      setPlaces(hits)
      
      
    },{
      center: {lat: user_pos.latitude, long: user_pos.longitude}, 
      radius: radius,
    });
}

export default Main;

const styles = StyleSheet.create({
    
    mapStyle: {
      width: theme.size.width,
      height: theme.size.height,
    },
    scrollView:{
      height : 50,
    },
    place: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingVertical: 10,
    },
    item: {
      elevation: 2,
      backgroundColor: "#FFF",
      borderTopLeftRadius: 5,
      borderTopRightRadius: 5,
      marginHorizontal: 10,
      height: CARD_HEIGHT,
      width: CARD_WIDTH,
      overflow: "hidden",
      justifyContent: 'center',
      flexDirection: 'column'
    },
    show_direction:{
      height: theme.size.height,
      width: theme.size.width,
    },
    top_view: {
      backgroundColor: 'rgba(255,255,255,0.75)',
      height: '100%',
      width: '101%',
      alignSelf: 'center',
      borderRadius: 22,
    },
    bottom_view: {
      backgroundColor: 'rgba(255,255,255,0.75)',
      height: '100%',
      width: '101%',
      alignSelf: 'center',
      borderRadius: 30,
    },
});