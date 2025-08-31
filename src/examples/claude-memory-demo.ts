/**
 * Demostración del nuevo sistema de memoria dinámica como Claude
 *
 * Este archivo muestra cómo el sistema ahora puede:
 * 1. Detectar automáticamente cuando el usuario quiere que recordemos algo
 * 2. Crear memorias dinámicas con títulos y contenido flexible
 * 3. Buscar y gestionar memorias como lo hace Claude
 */

import { ElectronCacheService, DynamicMemory } from '../core/storage/ElectronCacheService';
import * as path from 'path';
import * as os from 'os';

export class ClaudeMemoryDemo {
  private cacheService: ElectronCacheService;

  constructor() {
    const storageDir = path.join(os.homedir(), '.cline-desktop-demo');
    this.cacheService = new ElectronCacheService(storageDir);
  }

  async initialize(): Promise<void> {
    await this.cacheService.initialize();
    console.log('🧠 [Demo] Sistema de memoria inicializado');
  }

  /**
   * Ejemplo 1: Crear memoria cuando el usuario dice su nombre
   */
  async demoUserName(): Promise<void> {
    console.log('\n=== DEMO 1: Información del usuario ===');

    // Simular que el usuario dice: "Mi nombre es Juan y me gusta programar en TypeScript"
    const userMessage = "Mi nombre es Juan y me gusta programar en TypeScript";
    console.log(`Usuario dice: "${userMessage}"`);

    // El sistema detectaría automáticamente esta información y crearía memorias
    await this.cacheService.createMemory(
      'Nombre del usuario',
      'El usuario se llama Juan',
      ['nombre', 'personal'],
      'high'
    );

    await this.cacheService.createMemory(
      'Preferencias de programación',
      'Le gusta programar en TypeScript',
      ['programación', 'preferencias'],
      'medium'
    );

    console.log('✅ Memorias creadas automáticamente');
  }

  /**
   * Ejemplo 2: Crear memoria cuando el usuario comparte preferencias
   */
  async demoUserPreferences(): Promise<void> {
    console.log('\n=== DEMO 2: Preferencias del usuario ===');

    // Simular: "Recuerda que prefiero usar espacios en lugar de tabs, y me gusta el tema oscuro"
    await this.cacheService.createMemory(
      'Preferencias de código',
      'Prefiere usar espacios en lugar de tabs para la indentación',
      ['código', 'estilo', 'preferencias'],
      'medium'
    );

    await this.cacheService.createMemory(
      'Preferencias de interfaz',
      'Prefiere usar tema oscuro en las aplicaciones',
      ['interfaz', 'tema', 'preferencias'],
      'low'
    );

    console.log('✅ Preferencias guardadas en memoria dinámica');
  }

  /**
   * Ejemplo 3: Buscar memorias como lo hace Claude
   */
  async demoSearchMemories(): Promise<void> {
    console.log('\n=== DEMO 3: Búsqueda de memorias ===');

    // Buscar por contenido
    const nameMemories = await this.cacheService.searchMemories('Juan');
    console.log(`🔍 Memorias que contienen "Juan": ${nameMemories.length}`);
    nameMemories.forEach(memory => {
      console.log(`  - ${memory.title}: ${memory.content}`);
    });

    // Buscar por tag
    const prefMemories = await this.cacheService.findMemoriesByTag('preferencias');
    console.log(`🏷️ Memorias con tag "preferencias": ${prefMemories.length}`);
    prefMemories.forEach(memory => {
      console.log(`  - ${memory.title}: ${memory.content}`);
    });
  }

  /**
   * Ejemplo 4: Actualizar memoria existente
   */
  async demoUpdateMemory(): Promise<void> {
    console.log('\n=== DEMO 4: Actualización de memorias ===');

    // Obtener todas las memorias
    const memories = await this.cacheService.getMemories();

    if (memories.length > 0) {
      const firstMemory = memories[0];
      console.log(`📝 Actualizando memoria: ${firstMemory.title}`);

      // Actualizar el contenido
      await this.cacheService.updateMemory(firstMemory.id, {
        content: firstMemory.content + ' (actualizado en demo)',
        tags: [...(firstMemory.tags || []), 'demo']
      });

      console.log('✅ Memoria actualizada');
    }
  }

  /**
   * Ejemplo 5: Mostrar todas las memorias
   */
  async demoListAllMemories(): Promise<void> {
    console.log('\n=== DEMO 5: Todas las memorias ===');

    const memories = await this.cacheService.getMemories();
    console.log(`📋 Total de memorias: ${memories.length}`);

    memories.forEach((memory, index) => {
      console.log(`\n${index + 1}. **${memory.title}**`);
      console.log(`   Contenido: ${memory.content}`);
      console.log(`   Tags: ${memory.tags?.join(', ') || 'ninguno'}`);
      console.log(`   Importancia: ${memory.importance}`);
      console.log(`   Creada: ${new Date(memory.created).toLocaleString()}`);
    });
  }

  /**
   * Ejecutar toda la demostración
   */
  async runDemo(): Promise<void> {
    try {
      await this.initialize();

      await this.demoUserName();
      await this.demoUserPreferences();
      await this.demoSearchMemories();
      await this.demoUpdateMemory();
      await this.demoListAllMemories();

      console.log('\n🎉 ¡Demostración completada!');
      console.log('\n📝 Resumen del nuevo sistema:');
      console.log('✅ Memorias dinámicas con títulos descriptivos');
      console.log('✅ Contenido flexible (no campos fijos)');
      console.log('✅ Sistema de tags para organización');
      console.log('✅ Búsqueda por contenido y tags');
      console.log('✅ Actualización y eliminación de memorias');
      console.log('✅ Detección automática de intención de memoria');

    } catch (error) {
      console.error('❌ Error en la demostración:', error);
    }
  }
}

// Ejecutar demo si se llama directamente
if (require.main === module) {
  const demo = new ClaudeMemoryDemo();
  demo.runDemo();
}
