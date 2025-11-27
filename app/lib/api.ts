import { getToken } from "@/app/lib/firebase";

// export const exampleAPICall = async (cityId: string): Promise<PoI[]> => {
//   try {
//     const token = await getToken();
//     const response = await fetch(`/api/places/${cityId}/pois`, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });
//     const data = (await response.json()) as PoI[];
//     return data;
//   } catch (error) {
//     console.error("Failed to fetch POIs:", error);
//     return [];
//   }
// };
