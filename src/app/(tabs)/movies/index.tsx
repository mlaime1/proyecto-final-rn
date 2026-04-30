import React, {useEffect,useState} from "react";
import {Text,View, FlatList} from "react-native"
import CardMovie from "@/components/ui/CardMovie";
import { fetchResults } from "@/services/api.client.placeholder";
import {supabase} from "@/lib/supabase"//importar la conexion con la base de datos del archivo supabase.ts
import { ENV } from "@/lib/env";
import Constants from "expo-constants";




function MoviesScreen() {

    const [movies,setMovies]= useState<{nombre: string, id: number}[]>([])


    async function handleState() {
       const {data,error}= await supabase.from("movies").select("*")

       if (error) {
           console.log("error", error);
           return;
       }

       if (data) {
       
        
        setMovies(data);
   
       }
    }
   
// console.log(movies);

    useEffect(()=>{
        //el codigo que queremos que se ejecute ni bien carga el componente
       handleState()
    },[])


    return(
        <View>
            <FlatList
            data={movies}
            renderItem={({item})=><CardMovie name={item.nombre} gender="test" id={item.id}/>}/>
        </View>
    )
}

export default MoviesScreen;