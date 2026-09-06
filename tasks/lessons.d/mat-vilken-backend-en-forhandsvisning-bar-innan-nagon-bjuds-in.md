# Mät vilken backend en förhandsvisning bär innan någon bjuds in att klicka

**Vercels PR-förhandsvisningar för detta repo byggde mot prod-projektet:
bundeln bar bara prods Supabase-host och ingen `VITE_FEATURE_BETALNINGAR`
— ett klick på Registrera i en preview hade bokfört i Lottas riktiga
data.** Mätt 2026-09-06 (ADR-132 verifiering a, `TASK-415`, `#2378`:s
preview, 152 chunkar grep:ade). Deployment Protection var på, så previews
var inte publika — risken var förväxling hos den som bjuds in, inte
läckage; det rättades i kortet. Regel: en förhandsvisning som ska visas
för en människa har sin backend mätt först (grep på Supabase-hosten i
bundeln), och branschmönstret är preview → delad förproduktionsmiljö
(research-passet `docs/research/pr-forhandsvisningar-och-backend-branschmonster-2026-09-06.md`).
