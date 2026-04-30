import React, {use, useEffect, useState} from "react";
import {Text,View} from "react-native"
import { useLocalSearchParams } from "expo-router";
import {supabase} from "@/lib/supabase"//importar la conexion con la base de datos del archivo supabase.ts

type Character = {
    id: number;
    nombre: string;
  
}


function MovieDetails() {

    const [character, setCharacter] = useState<Character | null>(null)

    const {id} = useLocalSearchParams()


   async function getCharacter() {
        const { data, error } = await supabase.from('movies').select().eq('id', id)

        if (error) {
            console.log('Error fetching character:', error);
        } else {
            setCharacter(data[0]); // Assuming you want the first character that matches
        }
    }

    useEffect(()=>{
        getCharacter()
    },[])

    return(
        <View>
            <Text>{character?.nombre}</Text>
        </View>
    )
}

export default MovieDetails;