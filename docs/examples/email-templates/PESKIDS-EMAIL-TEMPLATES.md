# Peskids — Plantillas de Email

## Template 1: Bienvenida a Papás

**GHL Name:** `Peskids — Welcome Parent`  
**Trigger:** Contact Created  
**Subject:** ¡Bienvenido a Peskids! Tu clase de prueba está aquí  
**Preview Text:** Aprende a nadar, diviértete y crece →

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a5f99; font-size: 32px; margin: 0; font-weight: 700;">🏊 Bienvenido a Peskids</h1>
            <p style="color: #666; font-size: 16px; margin: 10px 0 0 0;">Donde tus hijos aprenden a nadar con confianza</p>
        </div>

        <div style="background-color: #e8f4f8; border-left: 4px solid #1a5f99; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <p style="margin: 0; color: #333; font-size: 16px; line-height: 1.6;">
                ¡Hola {{contact.first_name}}!
            </p>
            <p style="margin: 15px 0 0 0; color: #333; font-size: 16px; line-height: 1.6;">
                Gracias por interesarte en Peskids. Estamos emocionados de conocer a {{child_name}} y ayudarle a descubrir la alegría de aprender a nadar.
            </p>
        </div>

        <h2 style="color: #1a5f99; font-size: 20px; margin: 30px 0 15px 0;">Tu Próximo Paso</h2>
        <p style="color: #333; font-size: 15px; line-height: 1.8; margin: 0;">
            Reserva la <strong>clase de prueba gratuita</strong> de {{child_name}}. Es la forma perfecta para:
        </p>
        <ul style="color: #333; font-size: 15px; line-height: 1.8; margin: 15px 0 0 0; padding-left: 20px;">
            <li>Que {{child_name}} conozca el ambiente</li>
            <li>Que veas nuestro método de enseñanza</li>
            <li>Determinar el nivel de natación</li>
            <li>Conocer a nuestros instructores certificados</li>
        </ul>

        <div style="text-align: center; margin: 40px 0;">
            <a href="{{calendar_link}}" style="background-color: #1a5f99; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">
                Reservar Clase de Prueba Gratis
            </a>
        </div>

        <div style="background-color: #f0f7ff; border-radius: 6px; padding: 20px; margin: 40px 0;">
            <p style="margin: 0; color: #1a5f99; font-weight: 600; font-size: 14px;">💡 ¿Sabías qué?</p>
            <ul style="margin: 10px 0 0 0; color: #333; font-size: 14px; line-height: 1.6; padding-left: 20px;">
                <li>El 95% de nuestros estudiantes nadan independientemente en 8 semanas</li>
                <li>Clases pequeñas (máximo 6 niños por instructor)</li>
                <li>Horarios flexibles: Lunes a Sábado</li>
            </ul>
        </div>

        <div style="background-color: #fff9e6; border-left: 4px solid #ffc107; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <p style="margin: 0; color: #856404; font-weight: 600; font-size: 14px;">📋 Para la Clase de Prueba:</p>
            <ul style="margin: 10px 0 0 0; color: #856404; font-size: 14px; line-height: 1.6; padding-left: 20px;">
                <li>Traje de baño y gorro (incluido si no tienen)</li>
                <li>Toalla</li>
                <li>Llegar 10 minutos antes</li>
            </ul>
        </div>

        <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
            ¿Preguntas? Escríbenos a <a href="mailto:hola@peskids.com" style="color: #1a5f99; text-decoration: none;">hola@peskids.com</a> o llama al {{phone}}
        </p>

        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 40px 0;">
        <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
            © 2026 Peskids — Natación para Niños<br>
            <a href="https://peskids.com" style="color: #1a5f99; text-decoration: none;">peskids.com</a>
        </p>
    </div>
</body>
</html>
```

---

## Template 2: Confirmación de Clase de Prueba

**GHL Name:** `Peskids — Trial Confirmation`  
**Trigger:** Appointment Scheduled (Trial Class calendar)  
**Subject:** Tu clase de prueba está confirmada  
**Preview Text:** {{appointment.date}} a las {{appointment.time}} →

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a5f99; font-size: 28px; margin: 0; font-weight: 700;">✓ ¡Confirmado!</h1>
            <p style="color: #666; font-size: 16px; margin: 10px 0 0 0;">La clase de {{child_name}} está reservada</p>
        </div>

        <div style="background-color: #e8f4f8; border-radius: 6px; padding: 25px; margin: 30px 0; border-left: 4px solid #1a5f99;">
            <p style="margin: 0; color: #1a5f99; font-size: 16px; font-weight: 600;">📅 Detalles de tu Clase</p>
            <p style="margin: 15px 0 0 0; color: #333; font-size: 15px; line-height: 1.8;">
                <strong>Niño/a:</strong> {{child_name}}<br>
                <strong>Fecha:</strong> {{appointment.date}}<br>
                <strong>Hora:</strong> {{appointment.time}}<br>
                <strong>Duración:</strong> 45 minutos<br>
                <strong>Ubicación:</strong> {{location_address}}<br>
                <strong>Instructor:</strong> {{instructor_name}}
            </p>
        </div>

        <h2 style="color: #1a5f99; font-size: 18px; margin: 30px 0 15px 0;">Qué Llevar</h2>
        <div style="background-color: #f9f9f9; border-radius: 6px; padding: 20px; margin: 20px 0;">
            <ul style="color: #333; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Traje de baño (proporcionamos si no tienes)</li>
                <li>Gorro de natación (proporcionamos si no tienes)</li>
                <li>Toalla</li>
                <li>Chinelas o sandalias</li>
            </ul>
        </div>

        <div style="background-color: #fafafa; border-radius: 6px; padding: 20px; margin: 30px 0;">
            <p style="margin: 0; color: #666; font-size: 14px; font-weight: 600;">👥 Tu Instructor:</p>
            <p style="margin: 10px 0 0 0; color: #333; font-size: 15px;">
                {{instructor_name}}<br>
                <span style="color: #666; font-size: 14px;">{{instructor_cert}} certificaciones • {{instructor_years}} años de experiencia</span>
            </p>
        </div>

        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 40px 0; border-radius: 4px;">
            <p style="margin: 0; color: #856404; font-size: 14px; font-weight: 600;">⏰ Recordatorio Importante</p>
            <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px; line-height: 1.6;">
                Te enviaremos un recordatorio SMS 24 horas antes. Por favor, confirma asistencia para que podamos prepararnos.
            </p>
        </div>

        <div style="text-align: center; margin: 40px 0;">
            <a href="{{confirmation_link}}" style="background-color: #1a5f99; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 15px; margin-right: 10px;">
                Confirmar Asistencia
            </a>
            <a href="{{reschedule_link}}" style="background-color: #f0f0f0; color: #333; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 15px;">
                Reprogramar
            </a>
        </div>

        <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
            <strong>¿Alguna pregunta?</strong> Escríbenos a <a href="mailto:hola@peskids.com" style="color: #1a5f99; text-decoration: none;">hola@peskids.com</a> o llama al {{phone}}
        </p>

        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 40px 0;">
        <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
            © 2026 Peskids — Natación para Niños<br>
            <a href="https://peskids.com" style="color: #1a5f99; text-decoration: none;">peskids.com</a>
        </p>
    </div>
</body>
</html>
```

---

## SMS Templates

### Template 1: Recordatorio de Clase (24h antes)

**GHL Name:** `Peskids — Trial Reminder`  
**Trigger:** Time-based (24h before)  
**Character limit:** 160 (Spanish compatible)

```
Hola {{contact.first_name}}, te recordamos tu clase de prueba de {{child_name}} mañana a las {{appointment.time}}. Lleva traje de baño y gorro. Confirma aquí: {{confirmation_link}}
```

---

## Guidelines para Copywriting

- Usar lenguaje amigable y motivacional
- Enfatizar beneficios para el niño
- Siempre incluir instrucciones claras
- Ofrecer opciones de reprogramar/cancelar
- Incluir información de contacto visible
- Agradecer la confianza en Peskids
- Destacar certificaciones de instructores
- Testear en móvil (70% de opens en móvil)
