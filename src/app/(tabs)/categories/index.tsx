import React from "react";
import {Text,View, Button} from "react-native"
import { useRouter } from "expo-router";


function Categories() {

    const router = useRouter()

    return(
        <View>
            <Button title="Ficcion" onPress={()=>router.push("/categories/1")}/>
            <Text>Pantalla categorias</Text>
        </View>
    )
}

export default Categories;