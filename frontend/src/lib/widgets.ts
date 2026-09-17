import { API_URL } from './auth';

export async function fetchWidgets() {
    const token = localStorage.getItem('dashboard-auth-token');
    const response = await fetch(`${API_URL}/widgets`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch widgets');
    }

    return response.json();
}

export async function createWidget(widgetData) {
    const token = localStorage.getItem('dashboard-auth-token');
    const response = await fetch(`${API_URL}/widgets`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(widgetData),
    });

    if (!response.ok) {
        throw new Error('Failed to create widget');
    }

    return response.json();
}

export async function updateWidgetLayouts(layouts) {
    const token = localStorage.getItem('dashboard-auth-token');
    const response = await fetch(`${API_URL}/widgets/layout`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ layouts }),
    });

    if (!response.ok) {
        throw new Error('Failed to update widget layouts');
    }
}

export async function deleteWidget(id) {
    const token = localStorage.getItem('dashboard-auth-token');
    const response = await fetch(`${API_URL}/widgets/${id}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to delete widget');
    }
}
