import { describe, it, expect } from 'vitest'
import {
  closestToneAtMost,
  insightCandidateTags,
  exactNameQuery,
  estimateDurationSec,
  getStepLocation,
  buildDirections,
  normalizeVoiceText,
  matchVoiceCommand,
  VOICE_COMMANDS,
  TONE_ORDER,
} from './VisitProgressContext'

describe('closestToneAtMost', () => {
  it('restituisce il tono stesso quando è tra quelli disponibili', () => {
    expect(closestToneAtMost(TONE_ORDER, 'medium')).toBe('medium')
    expect(closestToneAtMost(['simple', 'medium', 'technical'], 'technical')).toBe('technical')
  })

  it('ripiega sul tono disponibile più vicino ma non più difficile del target', () => {
    // 'medium' non è disponibile: il più vicino <= medium è 'simple'
    expect(closestToneAtMost(['childish', 'simple', 'technical'], 'medium')).toBe('simple')
  })

  it('se sono disponibili solo toni più difficili del target usa il primo (il più facile)', () => {
    expect(closestToneAtMost(['medium', 'technical'], 'childish')).toBe('medium')
    expect(closestToneAtMost(['technical'], 'childish')).toBe('technical')
  })

  it('con un target sconosciuto ripiega sul primo tono disponibile', () => {
    expect(closestToneAtMost(['simple', 'medium'], 'inesistente')).toBe('simple')
  })

  it('con elenco vuoto restituisce undefined', () => {
    expect(closestToneAtMost([], 'medium')).toBeUndefined()
  })
})

describe('insightCandidateTags', () => {
  it("unisce i tag dell'entità e quelli degli item, nell'ordine", () => {
    const entity = { name: 'Opera', tags: ['Rinascimento'] }
    const items = [{ tags: ['Firenze'] }, { tags: ['Botticelli'] }]
    expect(insightCandidateTags(entity, items)).toEqual(['Rinascimento', 'Firenze', 'Botticelli'])
  })

  it("scarta il tag che coincide col nome dell'entità (ignorando maiuscole e spazi)", () => {
    const entity = { name: ' Annunciazione ', tags: ['annunciazione', 'Rinascimento'] }
    expect(insightCandidateTags(entity, [])).toEqual(['Rinascimento'])
  })

  it('deduplica ignorando maiuscole e spazi, tenendo la prima occorrenza', () => {
    const entity = { name: 'X', tags: ['Botticelli'] }
    const items = [{ tags: [' botticelli ', 'Firenze'] }, { tags: ['FIRENZE'] }]
    expect(insightCandidateTags(entity, items)).toEqual(['Botticelli', 'Firenze'])
  })

  it('è robusto a entità/item nulli o senza tag', () => {
    expect(insightCandidateTags(null, null)).toEqual([])
    expect(insightCandidateTags({ name: 'X' }, undefined)).toEqual([])
    expect(insightCandidateTags({ name: 'X', tags: ['a'] }, [null, {}, { tags: ['b'] }])).toEqual([
      'a',
      'b',
    ])
  })
})

describe('exactNameQuery', () => {
  it('ancora il nome tra ^ e $', () => {
    expect(exactNameQuery('Rinascimento')).toBe('^Rinascimento$')
  })

  it('fa lo escape dei metacaratteri delle regex', () => {
    expect(exactNameQuery('Doppio ritratto (1465)')).toBe('^Doppio ritratto \\(1465\\)$')
    expect(exactNameQuery('a.b*c+d?')).toBe('^a\\.b\\*c\\+d\\?$')
  })

  it('produce una regex che combacia solo col nome esatto (non come sottostringa)', () => {
    const re = new RegExp(exactNameQuery('Venere di Urbino'), 'i')
    expect(re.test('venere di urbino')).toBe(true)
    expect(re.test('La Venere di Urbino')).toBe(false)
    expect(re.test('Venere di Urbino (copia)')).toBe(false)
  })

  it('un nome con parentesi non diventa un gruppo di cattura', () => {
    const re = new RegExp(exactNameQuery('Ritratto (Uomo)'))
    expect(re.test('Ritratto (Uomo)')).toBe(true)
    expect(re.test('Ritratto Uomo')).toBe(false)
  })
})

describe('estimateDurationSec', () => {
  it('senza testo restituisce 0', () => {
    expect(estimateDurationSec('')).toBe(0)
    expect(estimateDurationSec('   ')).toBe(0)
    expect(estimateDurationSec(null)).toBe(0)
    expect(estimateDurationSec(undefined)).toBe(0)
  })

  it('non scende mai sotto 1 secondo quando c\'è almeno una parola', () => {
    expect(estimateDurationSec('ciao')).toBe(1)
  })

  it('stima ~150 parole al minuto (0,4 sec per parola)', () => {
    expect(estimateDurationSec('a b c d e')).toBe(2) // 5 parole → round(2)
    expect(estimateDurationSec(Array(150).fill('parola').join(' '))).toBe(60)
  })

  it('ignora gli spazi multipli nel conteggio delle parole', () => {
    expect(estimateDurationSec('  molte    parole   con   spazi  ')).toBe(2) // 4 parole → round(1.6)
  })
})

describe('getStepLocation', () => {
  it('restituisce null per uno step senza entità o non fisico', () => {
    expect(getStepLocation(null)).toBeNull()
    expect(getStepLocation({})).toBeNull()
    expect(getStepLocation({ entity: { is_physical: false }, museum: { _id: 'm1', name: 'X' } })).toBeNull()
  })

  it('risolve piano/stanza dal placement nel museo di quello step (museo popolato)', () => {
    const step = {
      entity: {
        is_physical: true,
        placements: [
          { museum: { _id: 'm1' }, location: { floor: '1', room: '10' } },
          { museum: { _id: 'm2' }, location: { floor: 'Terra', room: 'Sala 5' } },
        ],
      },
      museum: { _id: 'm2', name: 'Accademia' },
    }
    expect(getStepLocation(step)).toEqual({
      museumId: 'm2',
      museumName: 'Accademia',
      floor: 'Terra',
      room: 'Sala 5',
    })
  })

  it('gestisce un placement con id museo grezzo (non popolato)', () => {
    const step = {
      entity: { is_physical: true, placements: [{ museum: 'm1', location: { floor: '2', room: '20' } }] },
      museum: { _id: 'm1', name: 'Uffizi' },
    }
    expect(getStepLocation(step)).toEqual({ museumId: 'm1', museumName: 'Uffizi', floor: '2', room: '20' })
  })

  it('con nessun placement per quel museo lascia piano/stanza vuoti', () => {
    const step = {
      entity: { is_physical: true, placements: [{ museum: { _id: 'altro' }, location: { floor: '9', room: '99' } }] },
      museum: { _id: 'm1', name: 'Uffizi' },
    }
    expect(getStepLocation(step)).toEqual({ museumId: 'm1', museumName: 'Uffizi', floor: '', room: '' })
  })

  it('è robusto a entità senza placements e step senza museo', () => {
    expect(getStepLocation({ entity: { is_physical: true } })).toEqual({
      museumId: null,
      museumName: '',
      floor: '',
      room: '',
    })
  })
})

describe('buildDirections', () => {
  const loc = (museumId, museumName, floor, room) => ({ museumId, museumName, floor, room })

  it('restituisce null se manca il punto di partenza o di arrivo', () => {
    expect(buildDirections(null, loc('m1', 'A', '1', '10'))).toBeNull()
    expect(buildDirections(loc('m1', 'A', '1', '10'), null)).toBeNull()
  })

  it('restituisce null quando la posizione non cambia', () => {
    expect(buildDirections(loc('m1', 'A', '1', '10'), loc('m1', 'A', '1', '10'))).toBeNull()
  })

  it('se cambia solo la stanza dà solo quella', () => {
    expect(buildDirections(loc('m1', 'A', '1', '10'), loc('m1', 'A', '1', '12'))).toEqual({
      text: 'Procedi nella stanza 12.',
      parts: [{ key: 'room', label: 'Stanza', value: '12' }],
    })
  })

  it('un cambio di piano implica anche la stanza', () => {
    expect(buildDirections(loc('m1', 'A', '1', '10'), loc('m1', 'A', '2', '20'))).toEqual({
      text: 'Procedi al piano 2, nella stanza 20.',
      parts: [
        { key: 'floor', label: 'Piano', value: '2' },
        { key: 'room', label: 'Stanza', value: '20' },
      ],
    })
  })

  it('un cambio di museo implica museo, piano e stanza', () => {
    expect(
      buildDirections(loc('m1', 'Uffizi', '1', '10'), loc('m2', 'Accademia', 'T', 'Sala 1'))
    ).toEqual({
      text: 'Procedi al museo Accademia, al piano T, nella stanza Sala 1.',
      parts: [
        { key: 'museum', label: 'Museo', value: 'Accademia' },
        { key: 'floor', label: 'Piano', value: 'T' },
        { key: 'room', label: 'Stanza', value: 'Sala 1' },
      ],
    })
  })

  it('salta i livelli senza valore sulla destinazione', () => {
    // cambio museo ma la destinazione non ha piano/stanza note → solo il museo
    expect(buildDirections(loc('m1', 'Uffizi', '1', '10'), loc('m2', 'Accademia', '', ''))).toEqual({
      text: 'Procedi al museo Accademia.',
      parts: [{ key: 'museum', label: 'Museo', value: 'Accademia' }],
    })
    // museo cambiato ma senza nome noto → si parte dal piano
    expect(buildDirections(loc('m1', 'A', '1', '10'), loc('m2', '', '2', '5'))).toEqual({
      text: 'Procedi al piano 2, nella stanza 5.',
      parts: [
        { key: 'floor', label: 'Piano', value: '2' },
        { key: 'room', label: 'Stanza', value: '5' },
      ],
    })
  })

  it('spostarsi verso una posizione senza stanza non produce indicazioni sulla stanza', () => {
    expect(buildDirections(loc('m1', 'A', '1', '10'), loc('m1', 'A', '1', ''))).toBeNull()
    expect(buildDirections(loc('m1', 'A', '1', '10'), loc('m1', 'A', '2', ''))).toEqual({
      text: 'Procedi al piano 2.',
      parts: [{ key: 'floor', label: 'Piano', value: '2' }],
    })
  })
})

describe('normalizeVoiceText', () => {
  it('minuscola, rimuove accenti e punteggiatura, collassa gli spazi', () => {
    expect(normalizeVoiceText('AVANTI')).toBe('avanti')
    expect(normalizeVoiceText('Perché è così?')).toBe('perche e cosi')
    expect(normalizeVoiceText('più')).toBe('piu')
    expect(normalizeVoiceText('ciao,  come   va!!!')).toBe('ciao come va')
    expect(normalizeVoiceText('  spazi   ai   bordi  ')).toBe('spazi ai bordi')
  })

  it('mantiene le cifre e gestisce input nullo', () => {
    expect(normalizeVoiceText('Sala 10')).toBe('sala 10')
    expect(normalizeVoiceText(null)).toBe('')
    expect(normalizeVoiceText(undefined)).toBe('')
  })
})

describe('matchVoiceCommand', () => {
  it('riconosce una frase esatta', () => {
    expect(matchVoiceCommand('prossimo')).toBe('nextStep')
    expect(matchVoiceCommand('indietro')).toBe('previousStep')
  })

  it('riconosce la frase anche dentro una frase più lunga', () => {
    expect(matchVoiceCommand('puoi andare avanti per favore')).toBe('nextStep')
    expect(matchVoiceCommand("scusa, dov'è il bagno?")).toBe('toilette')
  })

  it('normalizza accenti e punteggiatura prima di confrontare', () => {
    expect(matchVoiceCommand('Più semplice, per favore!')).toBe('simplerTone')
    expect(matchVoiceCommand('dimmi di più')).toBe('moreDetails')
  })

  it('restituisce null quando nessuna frase combacia', () => {
    expect(matchVoiceCommand('bla bla bla')).toBeNull()
    expect(matchVoiceCommand('')).toBeNull()
    expect(matchVoiceCommand('   ')).toBeNull()
    expect(matchVoiceCommand(null)).toBeNull()
  })

  it('a parità di match vince il comando che viene prima nella lista', () => {
    expect(matchVoiceCommand('prima precedente poi prossimo')).toBe('previousStep')
  })
})

describe('VOICE_COMMANDS (invarianti su cui si regge il matcher)', () => {
  it('ogni frase è già in forma normalizzata', () => {
    for (const cmd of VOICE_COMMANDS) {
      for (const phrase of cmd.phrases) {
        expect(normalizeVoiceText(phrase)).toBe(phrase)
      }
    }
  })

  it('nessuna frase è sottostringa di una frase di un altro comando', () => {
    const all = VOICE_COMMANDS.flatMap((c) => c.phrases.map((p) => ({ key: c.key, p })))
    for (const a of all) {
      for (const b of all) {
        if (a.key === b.key) continue
        expect(a.p.includes(b.p)).toBe(false)
      }
    }
  })
})
