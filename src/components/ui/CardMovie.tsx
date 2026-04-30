import React from "react";
import { useRouter } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
    name: string,
    gender: string,
    id: number
}

function CardMovie({name,gender, id}:Props) {
    const router = useRouter()


    return (
        <View style={styles.card}>
            <View style={styles.info}>
                <Text style={styles.title}>{name}</Text>
                <Text style={styles.year}>2025</Text>
                <Text style={styles.genre}>{gender}</Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#999" onPress={()=>router.push(`/movies/${id}`)}/>
        </View>
    )
}

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",          // 🔑 horizontal
        alignItems: "center",          // centra verticalmente
        padding: 12,
        backgroundColor: "#fff",
        borderRadius: 12,
        marginBottom: 10,

        // sombra (iOS)
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },

        // sombra (Android)
        elevation: 2,
    },

    image: {
        width: 60,
        height: 90,
        borderRadius: 8,
        marginRight: 12,
    },

    info: {
        flex: 1, // 🔑 ocupa todo el espacio disponible
    },

    title: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 4,
    },

    year: {
        fontSize: 14,
        color: "#666",
    },

    genre: {
        fontSize: 14,
        color: "#999",
    },
});

export default CardMovie