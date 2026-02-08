# Průvodce pro import do WordPress Divi

Tento dokument popisuje, jak přenést HTML/CSS strukturu do WordPress Divi Builder.

## 🎨 Design Tokens pro Divi Theme Customizer

### Barvy (Theme Options → General → Background + Colors)

```css
/* Zkopírujte tyto hodnoty do Divi Theme Customizer */
Primary Color: #d4af37 (Mystic Gold)
Secondary Color: #9b59b6 (Ethereal Violet)
Body Text Color: #c0c5d0 (Silver Mist)
Header Text Color: #f0e6ff (Starlight)
Background Color: #0a0a1a (Deep Space)
```

### Typography (Theme Builder → Global Settings)

**Headings:**
- Font: Cinzel (dostupný v Divi)
- Weight: 600
- Letter Spacing: 0.02em

**Body Text:**
- Font: Inter (dostupný v Divi)
- Weight: 400
- Size: 16px
- Line Height: 1.6

---

## 📋 Mapování HTML na Divi Moduly

### Header
| HTML Element | Divi Module |
|--------------|-------------|
| `.header` | Theme Builder → Header |
| `.logo` | Image + Text Module |
| `.nav__list` | Menu Module |
| `.btn--primary` | Button Module |

### Hero Section
| HTML Element | Divi Module |
|--------------|-------------|
| `.section--hero` | Fullwidth Header Module |
| `.hero__badge` | Blurb (icon + text) |
| `.hero__title` | Text Module (H1) |
| `.hero__subtitle` | Text Module |
| `.hero__cta` | Button Modules |

### Services Section
| HTML Element | Divi Module |
|--------------|-------------|
| `.grid-3` | Row (3 Columns, Equal) |
| `.card--service` | Blurb Module |
| `.card__icon` | Icon |
| `.card__title` | Blurb Title |
| `.card__text` | Blurb Body |

### Steps/Process
| HTML Element | Divi Module |
|--------------|-------------|
| `.steps` | Row (3 Columns) |
| `.step__number` | Number Counter Module |
| `.step__title` | Text Module |
| `.step__text` | Text Module |

### Testimonials
| HTML Element | Divi Module |
|--------------|-------------|
| `.testimonial` | Testimonial Module |
| `.testimonial__text` | Body |
| `.testimonial__author` | Author + Position |

### Pricing
| HTML Element | Divi Module |
|--------------|-------------|
| `.card--pricing` | Pricing Table Module |
| `.card__price` | Price |
| `.card__features li` | Feature Items |
| `.featured` | Enable "Featured" toggle |

### CTA Banner
| HTML Element | Divi Module |
|--------------|-------------|
| `.cta-banner` | CTA Module |
| `.email-form` | Email Optin Module |

### Footer
| HTML Element | Divi Module |
|--------------|-------------|
| `.footer__grid` | Theme Builder → Footer |
| `.footer__brand` | Column 1 (Logo + Text) |
| `.footer__links` | Column 2-4 (Text with links) |

---

## 🌟 Custom CSS pro Divi

Vložte do **Divi → Theme Options → Custom CSS**:

```css
/* Gradient Text Effect */
.text-gradient {
  background: linear-gradient(135deg, #d4af37 0%, #e8c860 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Glow Effect */
.text-glow {
  text-shadow: 0 0 20px rgba(212, 175, 55, 0.5);
}

/* Card Hover Effect */
.et_pb_blurb:hover {
  transform: translateY(-8px);
  border-color: rgba(212, 175, 55, 0.3);
  box-shadow: 0 0 30px rgba(212, 175, 55, 0.3);
}

/* Button Primary Style */
.btn-primary {
  background: linear-gradient(135deg, #d4af37 0%, #e8c860 100%) !important;
  box-shadow: 0 0 30px rgba(212, 175, 55, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 60px rgba(212, 175, 55, 0.5);
}

/* Animated Stars Background */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: 
    radial-gradient(2px 2px at 20px 30px, white, transparent),
    radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
    radial-gradient(1px 1px at 90px 40px, white, transparent),
    radial-gradient(2px 2px at 160px 120px, rgba(255,255,255,0.9), transparent);
  background-repeat: repeat;
  background-size: 200px 200px;
  animation: twinkle 4s ease-in-out infinite;
  pointer-events: none;
  z-index: -1;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}
```

---

## 📱 Responzivní nastavení

V Divi Module Settings použijte:

**Desktop:** Použijte hodnoty jako v CSS  
**Tablet:** Font sizes -20%, spacing -15%  
**Mobile:** Single column layout, centered text

---

## ✅ Postup importu

1. **Nainstalujte fonty** - Cinzel a Inter jsou v Divi dostupné
2. **Nastavte barvy** v Theme Options
3. **Vytvořte Header** v Theme Builder
4. **Vytvořte stránky** pomocí Divi Builder
5. **Pro každou sekci** - použijte odpovídající Divi modul podle tabulky
6. **Vložte Custom CSS** do Theme Options
7. **Otestujte responzivitu** na všech zařízeních

---

## 🔗 Užitečné odkazy

- [Divi Documentation](https://www.elegantthemes.com/documentation/divi/)
- [Google Fonts - Cinzel](https://fonts.google.com/specimen/Cinzel)
- [Google Fonts - Inter](https://fonts.google.com/specimen/Inter)
