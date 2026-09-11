import { SimulationState, VisualParams } from '../types';

export const STATE_CONFIGS: Record<SimulationState, VisualParams> = {
  disconnected: {
    color: '#708390',        // Muted Slate Gray
    sand_speed: 2.2,
    particle_density: 0.6,
    glow_intensity: 0.2,
    pause_probability: 0.0,
    reverse_gravity: false,
    ambient_energy: 0.3,
    display_name: 'DISCONNECTED',
  },
  neutral: {
    color: '#3CB371',        // Soft Ancient Emerald
    sand_speed: 1.0,
    particle_density: 0.8,
    glow_intensity: 0.4,
    pause_probability: 0.02,
    reverse_gravity: false,
    ambient_energy: 0.5,
    display_name: 'NEUTRAL',
  },
  engaged: {
    color: '#34D399',        // Bright Emerald
    sand_speed: 0.6,
    particle_density: 1.0,
    glow_intensity: 0.7,
    pause_probability: 0.08,
    reverse_gravity: false,
    ambient_energy: 0.7,
    display_name: 'ENGAGED',
  },
  meaningful: {
    color: '#E5B869',        // Warm Sand Gold
    sand_speed: 0.25,
    particle_density: 1.2,
    glow_intensity: 0.9,
    pause_probability: 0.25,
    reverse_gravity: false,
    ambient_energy: 0.85,
    display_name: 'MEANINGFUL',
  },
  deep_moment: {
    color: '#FFE082',        // Radiant Stardust Gold
    sand_speed: 0.05,
    particle_density: 1.4,
    glow_intensity: 1.0,
    pause_probability: 0.70,
    reverse_gravity: true,
    ambient_energy: 1.0,
    display_name: 'DEEP MOMENT',
  },
  emotionally_intense: {
    color: '#E63946',        // Crimson Ruby Red
    sand_speed: 1.5,
    particle_density: 1.1,
    glow_intensity: 0.85,
    pause_probability: 0.05,
    reverse_gravity: false,
    ambient_energy: 0.95,
    display_name: 'INTENSE',
  },
  low_confidence: {
    color: '#9EADB2',        // Platinum Silver
    sand_speed: 1.0,
    particle_density: 0.75,
    glow_intensity: 0.35,
    pause_probability: 0.0,
    reverse_gravity: false,
    ambient_energy: 0.4,
    display_name: 'AMBIENT',
  },
  insufficient_data: {
    color: '#435360',        // Charcoal Slate
    sand_speed: 1.0,
    particle_density: 0.7,
    glow_intensity: 0.3,
    pause_probability: 0.0,
    reverse_gravity: false,
    ambient_energy: 0.3,
    display_name: 'AWAITING',
  },
};
