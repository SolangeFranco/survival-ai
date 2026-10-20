# SURVIVAL AI — Only the Adaptable Survive

Simulador evolutivo en navegador, implementado con HTML, CSS y JavaScript sin dependencias ni instalaciones adicionales.

## Ejecutar

Abre `index.html` con un navegador moderno. También puedes servir esta carpeta desde cualquier servidor estático local. No requiere compilación.

## Cómo funciona

- Cada agente tiene energía, velocidad, percepción, metabolismo, esperanza de vida, edad y rasgos heredables.
- Los agentes buscan recursos cercanos y ajustan su rumbo hacia ellos; si no detectan alimento, exploran manteniendo una trayectoria con variación gradual.
- Moverse y mantener su metabolismo consume energía. Agotar la energía o superar la esperanza de vida provoca la muerte.
- Dos agentes próximos con energía suficiente pueden reproducirse. Sus descendientes heredan una combinación de los rasgos parentales, con mutaciones según la tasa configurada.
- Nutrientes, biomasa y minerales entregan cantidades diferentes de energía. Los nodos consumidos desaparecen y vuelven a regenerarse gradualmente hasta el límite configurado.
- Velocidad, percepción, metabolismo y longevidad afectan las posibilidades de supervivencia; la evolución emerge de la competencia, no de cambios aleatorios de estadísticas globales.

## Controles

- **Iniciar / Pausar:** comienza o detiene el avance de la simulación.
- **Reiniciar:** restablece agentes, recursos, tiempo, estadísticas, velocidad y parámetros a sus valores iniciales.
- **Velocidad − / +:** ajusta el ritmo entre 0,5× y 8×.
- **Inyectar energía:** añade hasta 25 unidades de energía a cada agente vivo.
- **Nodos de recursos − / +:** cambia inmediatamente la cantidad objetivo de nodos.
- **Población inicial:** determina cuántos agentes aparecen al reiniciar.
- **Tasa de mutación:** determina la probabilidad de mutación de cada rasgo heredable.
- **Escasez:** modifica el intervalo de regeneración de recursos, desde abundante hasta extrema.

## Estadísticas

El panel presenta población viva, generación máxima alcanzada, tiempo simulado, nacimientos, muertes, energía promedio, mayor energía actual, nodos disponibles, mayor edad y mejor supervivencia registrada. El gráfico conserva las últimas 60 muestras de población y energía promedio.
