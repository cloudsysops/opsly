# Peskids — Re-engagement & Referral Automations

## Smart Lists

### Cold Leads (7+ days no contact)
- Filter: Status = "New Lead" OR "Contacted"
- Filter: Last Activity > 7 days ago
- Filter: Pipeline = "Peskids Enrollment"
- Exclude: Has tag `reengaged` (to avoid double-sending)

### Cold Leads (30+ days, final attempt)
- Same as above but 30+ days
- Action: Move to "Lost" stage after re-engagement sequence

## GHL Workflows

### Workflow: Re-engagement Sequence
**Trigger:** Smart List Entry ("Cold Leads 7+ days")
**Actions:**
1. Add Tag: `reengagement_1`
2. Send SMS: "Hi [name], still interested in swimming classes at Peskids? We have a special trial offer this month. Reply TRIAL to schedule."
3. Wait: 3 days
4. If no response:
   a. Send SMS: "Last chance! Our trial class offer ends this week. Book now at [link]"
   b. Wait: 4 days  
   c. If still no response: Add tag `reengaged_no_response`
5. If responded:
   a. Move pipeline to "Contacted"
   b. Notify owner

### Workflow: Referral Code Applied
**Trigger:** Custom Field Updated (referral_code is not empty)
**Actions:**
1. Add Tag: `referred`
2. If `referred_by_code` is set:
   a. Find referrer contact by referral code
   b. Add Tag: `referral_redeemed` to referrer
   c. Apply discount to referrer's next enrollment (manual step for now)

## Referral Flow
1. Lead enters via referral link → `referral_source='referral'` + `referred_by_code=XXXX`
2. When referred lead enrolls (stage = "Enrolled"):
   a. Referrer gets discount applied to next month
   b. Referrer gets SMS: "Thanks for referring [name]! Your discount has been applied."
3. Referral discount: $10 USD off next month (`PESKIDS_REFERRAL_DISCOUNT_CENTS` = 1000)

## Re-engagement Message Templates

### SMS 1 (Day 7) - Spanish
"¡Hola {parent_name}! Soy de Peskids. Vimos que hace unos días preguntaste por nuestras clases de natación. ¿Qué tal si agendamos una clase de prueba gratis esta semana? Responde SÍ y te contacto 😊"

### SMS 2 (Day 10) - Spanish (If no response)
"¡Hola! Queremos recordarte que tu clase de prueba gratuita en Peskids sigue disponible. Tenemos horarios flexibles en Llanogrande y a domicilio. ¿Te gustaría probar? 🏊‍♂️"

### SMS 3 (Day 30 - Final) - Spanish
"Último aviso: tu invitación a clase de prueba gratuita en Peskids vence pronto. No pierdas la oportunidad de que tu hijo aprenda a nadar. ¡Responde y te agendamos! 🙌"

## Integration with Code

| Service | Method | Purpose |
|---------|--------|---------|
| `LeadFollowupService` | `findReengagementCandidates(minDays, maxDays)` | Find leads in re-engagement window |
| `LeadFollowupService` | `sendReengagementSequence(contactId, daysSinceContact)` | Send day-appropriate re-engagement SMS |
| `GhlReferralService` | `storeReferralCode(ghlContactId, referralCode)` | Persist referral code as GHL custom field |
| `GhlReferralService` | `linkReferral(newContactId, referredByCode)` | Tag new lead as referred, store referrer code |
| `GhlReferralService` | `markReferralRedeemed(referrerContactId, discountCents)` | Apply discount to referrer on enrollment |
| `GhlReferralService` | `getReferralStats(ghlContactId)` | Read referral metrics for a contact |
