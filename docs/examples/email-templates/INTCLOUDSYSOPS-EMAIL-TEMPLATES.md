# Intcloudsysops/ICSO — Email Templates

## Template 1: Welcome Lead

**GHL Name:** `Opsly — Welcome Lead`  
**Trigger:** Contact Created  
**Subject:** Welcome to Opsly! Here's what happens next  
**Preview Text:** Discovery call scheduling inside →

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
            <h1 style="color: #1a1a1a; font-size: 28px; margin: 0; font-weight: 700;">Welcome to Opsly</h1>
            <p style="color: #666; font-size: 16px; margin: 10px 0 0 0;">Your cloud infrastructure partner</p>
        </div>

        <div style="background-color: #f9f9f9; border-left: 4px solid #0066cc; padding: 20px; margin: 30px 0;">
            <p style="margin: 0; color: #333; font-size: 16px; line-height: 1.6;">
                Hi {{contact.first_name}},
            </p>
            <p style="margin: 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                Thanks for reaching out to Opsly! We're excited to learn more about your infrastructure needs.
            </p>
        </div>

        <h2 style="color: #1a1a1a; font-size: 18px; margin: 30px 0 15px 0;">What's Next?</h2>
        <ol style="color: #333; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li><strong>Schedule a discovery call</strong> — 30 minutes with our team to understand your challenges</li>
            <li><strong>Get personalized recommendations</strong> — Based on your infrastructure needs</li>
            <li><strong>Explore solutions together</strong> — See how Opsly can help scale your business</li>
        </ol>

        <div style="text-align: center; margin: 40px 0;">
            <a href="{{calendar_link}}" style="background-color: #0066cc; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">
                Schedule Discovery Call
            </a>
        </div>

        <div style="background-color: #f0f7ff; border-radius: 6px; padding: 20px; margin: 40px 0;">
            <p style="margin: 0; color: #0066cc; font-weight: 600; font-size: 14px;">💡 First-time customer?</p>
            <p style="margin: 10px 0 0 0; color: #333; font-size: 14px; line-height: 1.6;">
                Most companies see 30-40% cost savings and 50% faster deployment with our cloud infrastructure solutions.
            </p>
        </div>

        <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
            Questions? Reply to this email or contact us at <a href="mailto:hello@opsly.intcloudsysops.com" style="color: #0066cc; text-decoration: none;">hello@opsly.intcloudsysops.com</a>
        </p>

        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 40px 0;">
        <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
            © 2026 Opsly — Cloud Infrastructure for Scale<br>
            <a href="https://opsly.intcloudsysops.com" style="color: #0066cc; text-decoration: none;">opsly.intcloudsysops.com</a>
        </p>
    </div>
</body>
</html>
```

---

## Template 2: Discovery Confirmation

**GHL Name:** `Opsly — Discovery Confirmation`  
**Trigger:** Appointment Scheduled  
**Subject:** Your discovery call with Opsly is confirmed  
**Preview Text:** {{appointment.date}} at {{appointment.time}} →

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
            <h1 style="color: #1a1a1a; font-size: 28px; margin: 0; font-weight: 700;">✓ Confirmed</h1>
            <p style="color: #666; font-size: 16px; margin: 10px 0 0 0;">Your discovery call is scheduled</p>
        </div>

        <div style="background-color: #f0f7ff; border-radius: 6px; padding: 20px; margin: 30px 0;">
            <p style="margin: 0; color: #333; font-size: 16px; font-weight: 600;">📅 Discovery Call Details</p>
            <p style="margin: 15px 0 0 0; color: #333; font-size: 15px; line-height: 1.8;">
                <strong>Date:</strong> {{appointment.date}}<br>
                <strong>Time:</strong> {{appointment.time}} ({{timezone}})<br>
                <strong>Duration:</strong> 30 minutes<br>
                <strong>Format:</strong> Zoom Call
            </p>
        </div>

        <h2 style="color: #1a1a1a; font-size: 18px; margin: 30px 0 15px 0;">What to Expect</h2>
        <ul style="color: #333; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li>Overview of your current infrastructure challenges</li>
            <li>Introduction to Opsly's cloud solutions</li>
            <li>Quick cost/performance analysis</li>
            <li>Q&A and next steps</li>
        </ul>

        <div style="background-color: #fafafa; border-radius: 6px; padding: 20px; margin: 30px 0;">
            <p style="margin: 0; color: #666; font-size: 14px; font-weight: 600;">👤 You'll be speaking with:</p>
            <p style="margin: 10px 0 0 0; color: #333; font-size: 15px;">
                {{staff_member.name}}<br>
                <span style="color: #666; font-size: 14px;">{{staff_member.title}} at Opsly</span>
            </p>
        </div>

        <div style="text-align: center; margin: 40px 0;">
            <a href="{{zoom_link}}" style="background-color: #0066cc; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">
                Join Zoom Call
            </a>
        </div>

        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 40px 0; border-radius: 4px;">
            <p style="margin: 0; color: #856404; font-size: 14px; font-weight: 600;">⏰ Reminder</p>
            <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px;">
                We'll send you a reminder 24 hours before the call. If you need to reschedule, just let us know!
            </p>
        </div>

        <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
            <strong>Can't make it?</strong> <a href="{{reschedule_link}}" style="color: #0066cc; text-decoration: none;">Reschedule here</a> or reply to this email.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 40px 0;">
        <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
            © 2026 Opsly — Cloud Infrastructure for Scale<br>
            <a href="https://opsly.intcloudsysops.com" style="color: #0066cc; text-decoration: none;">opsly.intcloudsysops.com</a>
        </p>
    </div>
</body>
</html>
```

---

## SMS Templates

### Template 1: Discovery Reminder (24h before)

**GHL Name:** `Opsly — Discovery Reminder`  
**Trigger:** Time-based (24h before)  
**Character limit:** 160

```
Hi {{contact.first_name}}, reminder: your discovery call with Opsly is tomorrow at {{appointment.time}}. Zoom link: {{zoom_link}}. Reply CONFIRM or call 1-XXX-XXX-XXXX
```

---

## Copy Guidelines

- Keep subject lines under 50 characters
- Use first names in body text for personalization
- Include clear CTA (Call-to-Action) button/link
- Add timezone to avoid confusion
- Always include reschedule/cancel option
- Test on mobile (60% of opens)
