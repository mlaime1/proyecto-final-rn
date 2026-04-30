// Placeholder for future API client (fetch/axios). Intentionally empty.
// Students can add their API configuration here.
 export async function fetchResults(category:string) {
            try {
                let response = await fetch(`https://rickandmortyapi.com/api/${category}`,{method:'GET'})
                 let data = await response.json()

                 if (!response.ok) {
                    throw new Error("Error : "+response.status)
                 }

                return data.results

            } catch (error) {
                console.error({error:error,
                    ok: false
                })
                return error
            }

    }
