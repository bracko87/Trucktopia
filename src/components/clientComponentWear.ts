import { componentWear } from './ComponentWearEngine'; // adjust if needed

if (typeof window !== 'undefined') {
  window.__componentWear = componentWear ?? {
    getComponents: (id: string) =>
      JSON.parse(localStorage.getItem(`truck_components_${id}`) || 'null'),
    listPending: (id: string) =>
      JSON.parse(localStorage.getItem(`pending_maintenance_${id}`) || '[]'),
    trigger: (truckId: string, km = 0) =>
      window.dispatchEvent(new CustomEvent('componentWear:trigger', { detail: { truckId, distanceKm: km } })),
  };
}
