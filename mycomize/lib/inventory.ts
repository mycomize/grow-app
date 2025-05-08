import { getBackendUrl } from './backendUrl';

export async function getInventoryItem(id: number) {
  const url = `${getBackendUrl()}/inventory/${id}/`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    throw error;
  }
}
