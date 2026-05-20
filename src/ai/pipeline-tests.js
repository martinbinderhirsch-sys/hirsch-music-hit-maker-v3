/**
 * HIRSCH MUSIC HIT MAKER — Pipeline Testsystem
 * =============================================
 * 100 Cluster in 3 Ebenen:
 *   Core 30     — muss fast immer stabil laufen
 *   Nuance 40   — Breite, Alltag, Milieu, Lebenslagen
 *   Conflict 30 — Ambivalenz, Doppelwahrheiten, Reibung
 *
 * Verwendung:
 *   runTests('core')      — nur Core 30
 *   runTests('conflict')  — Core + Conflict (Signal-Änderungen)
 *   runTests('all')       — alle 100 (vor Release)
 */

'use strict';

// ─── Cluster-Definitionen ────────────────────────────────────────
// Jeder Cluster: { theme, mood[], notes, expected_family, expected_shade }

const CLUSTER_DEFS = {

  // ══ CORE 30 ══════════════════════════════════════════════════════
  young_summer_freedom:       { theme:'Freiheit im Sommer', mood:['freude','relief'], notes:'', ef:'joy', es:'relieved_gladness' },
  funny_flirt:                { theme:'Ein charmanter Flirt', mood:['freude','liebe'], notes:'', ef:'love', es:'tender_attachment' },
  simple_beautiful_day:       { theme:'Ein schöner einfacher Tag', mood:['freude','dankbar'], notes:'', ef:'joy', es:'relieved_gladness' },
  autumn_after_breakup:       { theme:'Herbst nach der Trennung', mood:['trauer','melanch'], notes:'', ef:'sadness', es:'restrained_grief' },
  love_after_hard_times:      { theme:'Liebe nach schwerer Zeit', mood:['liebe','relief'], notes:'trauer war lang', ef:'love', es:'love_with_ache' },
  first_child_birth:          { theme:'Geburt meines ersten Kindes', mood:['freude','dankbar','liebe'], notes:'', ef:'joy', es:'relieved_gladness' },
  worker_pride:               { theme:'Stolz auf meine Arbeit', mood:['freude','dankbar'], notes:'', ef:'joy', es:'relieved_gladness' },
  defiant_stand:              { theme:'Ich stehe zu mir', mood:['wut','defiant'], notes:'', ef:'anger', es:'controlled_defiance' },
  shame_in_family:            { theme:'Scham in der Familie', mood:['trauer','melanch'], notes:'', ef:'sadness', es:'restrained_grief' },
  guilt_and_repair:           { theme:'Schuld und Wiedergutmachung', mood:['trauer','liebe'], notes:'', ef:'sadness', es:'grief_with_love' },
  quiet_married_love:         { theme:'Stille Liebe nach langen Jahren', mood:['liebe','zärtlich'], notes:'', ef:'love', es:'tender_attachment' },
  calm_morning_repair:        { theme:'Versöhnung am Morgen', mood:['liebe','relief'], notes:'', ef:'love', es:'tender_attachment' },
  rural_summer_work:          { theme:'Arbeit im Sommer auf dem Land', mood:['freude','dankbar'], notes:'', ef:'joy', es:'relieved_gladness' },
  romantic_reunion_station:   { theme:'Wiedersehen am Bahnhof', mood:['liebe','freude'], notes:'', ef:'love', es:'tender_attachment' },
  sacred_awe_in_nature:       { theme:'Ehrfurcht in der Natur', mood:['dankbar','freude'], notes:'', ef:'joy', es:'relieved_gladness' },
  teenage_rebellion:          { theme:'Jugendliche Rebellion', mood:['wut','defiant'], notes:'', ef:'anger', es:'controlled_defiance' },
  market_morning:             { theme:'Morgens auf dem Markt', mood:['freude'], notes:'', ef:'joy', es:'relieved_gladness' },
  hospital_waiting_room:      { theme:'Im Wartezimmer des Krankenhauses', mood:['trauer','angst'], notes:'', ef:'sadness', es:'restrained_grief' },
  religious_procession:       { theme:'Religiöse Prozession', mood:['dankbar','freude'], notes:'', ef:'joy', es:'relieved_gladness' },
  pub_after_shift:            { theme:'Nach der Schicht in der Kneipe', mood:['freude','relief'], notes:'', ef:'joy', es:'relieved_gladness' },
  summer_storm_relief:        { theme:'Erleichterung nach dem Sommersturm', mood:['relief','freude'], notes:'', ef:'joy', es:'relieved_gladness' },
  neighborly_kindness:        { theme:'Freundlichkeit der Nachbarn', mood:['dankbar','freude'], notes:'', ef:'joy', es:'relieved_gladness' },
  public_humiliation:         { theme:'Öffentliche Demütigung', mood:['wut','trauer'], notes:'', ef:'anger', es:'hurt_defiance' },
  athlete_comeback:           { theme:'Comeback nach Verletzung', mood:['freude','relief'], notes:'schmerz war lang', ef:'joy', es:'relief_after_pain' },
  quiet_reading_evening:      { theme:'Ruhiger Leseabend', mood:['freude'], notes:'', ef:'joy', es:'relieved_gladness' },
  wedding_before_vows:        { theme:'Vor den Hochzeitsgelübden', mood:['liebe','freude'], notes:'', ef:'love', es:'tender_attachment' },
  bankruptcy_notice:          { theme:'Die Insolvenzbekanntmachung', mood:['trauer','wut'], notes:'', ef:'sadness', es:'restrained_grief' },
  childhood_bicycle:          { theme:'Das Fahrrad aus der Kindheit', mood:['dankbar','trauer'], notes:'', ef:'sadness', es:'loss_with_gratitude' },
  festival_euphoria:          { theme:'Euphorie auf dem Festival', mood:['freude'], notes:'', ef:'joy', es:'relieved_gladness' },
  office_window_burnout:      { theme:'Burnout am Bürofenster', mood:['trauer','melanch'], notes:'', ef:'sadness', es:'restrained_grief' },

  // ══ NUANCE 40 ════════════════════════════════════════════════════
  cool_city_night:            { theme:'Kühle Stadtnacht', mood:['melanch'], notes:'', ef:'sadness', es:'restrained_grief' },
  friends_summer_night:       { theme:'Sommernacht mit Freunden', mood:['freude','liebe'], notes:'', ef:'joy', es:'relieved_gladness' },
  city_ambition:              { theme:'Ehrgeiz in der Stadt', mood:['wut','freude'], notes:'', ef:'joy', es:'relieved_gladness' },
  mother_kitchen_memory:      { theme:'Erinnerung an die Küche der Mutter', mood:['dankbar','trauer'], notes:'', ef:'sadness', es:'loss_with_gratitude' },
  lonely_hotel_room:          { theme:'Einsames Hotelzimmer', mood:['trauer','melanch'], notes:'', ef:'sadness', es:'restrained_grief' },
  cool_but_lonely:            { theme:'Cool aber einsam', mood:['melanch'], notes:'', ef:'sadness', es:'restrained_grief' },
  old_age_garden:             { theme:'Der Garten im Alter', mood:['dankbar','trauer'], notes:'', ef:'sadness', es:'loss_with_gratitude' },
  schoolyard_exclusion:       { theme:'Ausgrenzung auf dem Schulhof', mood:['trauer','wut'], notes:'', ef:'sadness', es:'restrained_grief' },
  new_job_first_day:          { theme:'Erster Tag im neuen Job', mood:['freude','angst'], notes:'', ef:'joy', es:'relieved_gladness' },
  father_son_distance:        { theme:'Distanz zwischen Vater und Sohn', mood:['trauer','liebe'], notes:'', ef:'sadness', es:'grief_with_love' },
  deserted_train_station:     { theme:'Verlassener Bahnhof', mood:['melanch','trauer'], notes:'', ef:'sadness', es:'restrained_grief' },
  secret_affair:              { theme:'Eine geheime Affäre', mood:['liebe','wut'], notes:'', ef:'love', es:'love_with_ache' },
  funny_masked_pain:          { theme:'Schmerz hinter Witzen', mood:['trauer'], notes:'lache aber weinte', ef:'sadness', es:'restrained_grief' },
  teacher_after_class:        { theme:'Der Lehrer nach dem Unterricht', mood:['melanch','dankbar'], notes:'', ef:'sadness', es:'loss_with_gratitude' },
  spring_after_depression:    { theme:'Frühling nach der Depression', mood:['relief','freude'], notes:'trauer lag lange', ef:'joy', es:'relief_after_pain' },
  soldier_homecoming_distance:{ theme:'Heimkehrer mit Abstand', mood:['trauer','liebe'], notes:'', ef:'sadness', es:'grief_with_love' },
  artistic_block:             { theme:'Künstlerische Blockade', mood:['melanch','wut'], notes:'', ef:'sadness', es:'restrained_grief' },
  nurse_night_shift:          { theme:'Nachtschicht als Pflegerin', mood:['melanch','dankbar'], notes:'', ef:'sadness', es:'restrained_grief' },
  seaside_after_argument:     { theme:'Am Meer nach dem Streit', mood:['trauer','liebe'], notes:'', ef:'sadness', es:'grief_with_love' },
  widower_morning:            { theme:'Morgen als Witwer', mood:['trauer','liebe'], notes:'', ef:'sadness', es:'grief_with_love' },
  late_night_radio_host:      { theme:'Nacht-Radiomoderator spät', mood:['melanch'], notes:'', ef:'sadness', es:'restrained_grief' },
  midlife_restlessness:       { theme:'Unruhe in der Lebensmitte', mood:['melanch','wut'], notes:'', ef:'sadness', es:'restrained_grief' },
  dog_after_owner_loss:       { theme:'Hund nach dem Verlust des Besitzers', mood:['trauer','liebe'], notes:'', ef:'sadness', es:'grief_with_love' },
  mountain_climb_exhaustion:  { theme:'Erschöpfung beim Bergsteigen', mood:['freude','relief'], notes:'', ef:'joy', es:'relieved_gladness' },
  small_town_gossip:          { theme:'Klatsch in der Kleinstadt', mood:['wut','trauer'], notes:'', ef:'anger', es:'hurt_defiance' },
  road_trip_brothers:         { theme:'Roadtrip mit dem Bruder', mood:['freude','liebe'], notes:'', ef:'joy', es:'relieved_gladness' },
  newly_single_apartment:     { theme:'Die neue Wohnung als Single', mood:['trauer','relief'], notes:'', ef:'joy', es:'grief_with_release' },
  rainy_window_city:          { theme:'Regenfenster in der Stadt', mood:['melanch'], notes:'', ef:'sadness', es:'restrained_grief' },
  playground_parenthood:      { theme:'Elternschaft auf dem Spielplatz', mood:['freude','liebe'], notes:'', ef:'joy', es:'relieved_gladness' },
  midnight_gas_station:       { theme:'Tankstelle um Mitternacht', mood:['melanch'], notes:'', ef:'sadness', es:'restrained_grief' },
  library_refuge:             { theme:'Zuflucht in der Bibliothek', mood:['dankbar','melanch'], notes:'', ef:'sadness', es:'restrained_grief' },
  night_train_departure:      { theme:'Nachtzug-Abfahrt', mood:['trauer','liebe'], notes:'', ef:'sadness', es:'grief_with_love' },
  retirement_last_shift:      { theme:'Letzte Schicht vor der Rente', mood:['dankbar','trauer'], notes:'', ef:'sadness', es:'loss_with_gratitude' },
  birthday_without_person:    { theme:'Geburtstag ohne die vermisste Person', mood:['trauer','liebe'], notes:'', ef:'sadness', es:'grief_with_love' },
  snow_morning_peace:         { theme:'Schneemorgen und Stille', mood:['freude','dankbar'], notes:'', ef:'joy', es:'relieved_gladness' },
  graduation_departure:       { theme:'Abschluss und Aufbruch', mood:['freude','trauer'], notes:'', ef:'joy', es:'grief_with_release' },
  bank_of_river_regret:       { theme:'Am Flussufer mit Bedauern', mood:['trauer','melanch'], notes:'', ef:'sadness', es:'restrained_grief' },
  crowded_subway_detachment:  { theme:'Abstand in der vollen U-Bahn', mood:['melanch'], notes:'', ef:'sadness', es:'restrained_grief' },
  first_paycheck_home:        { theme:'Erster Lohn nach Hause', mood:['freude','dankbar'], notes:'', ef:'joy', es:'relieved_gladness' },
  first_solo_trip:            { theme:'Erste Reise alleine', mood:['freude','relief'], notes:'', ef:'joy', es:'relieved_gladness' },

  // ══ CONFLICT 30 ══════════════════════════════════════════════════
  grief_with_release_case:    { theme:'Endlich Frieden nach langem Leiden', mood:['trauer','relief'], notes:'er leidet nicht mehr', ef:'sadness', es:'grief_with_release' },
  parting_with_relief_case:   { theme:'Abschied der befreit', mood:['trauer','relief'], notes:'erleichterung dass es vorbei ist', ef:'sadness', es:'grief_with_release' },
  loss_with_gratitude:        { theme:'Verlust mit tiefer Dankbarkeit', mood:['trauer','dankbar'], notes:'dankbar für alles was war', ef:'sadness', es:'loss_with_gratitude' },
  jealous_possessive_love:    { theme:'Eifersüchtige Liebe die festhält', mood:['liebe','wut'], notes:'', ef:'love', es:'love_with_ache' },
  political_discontent:       { theme:'Politische Unzufriedenheit', mood:['wut','melanch'], notes:'', ef:'anger', es:'controlled_defiance' },
  street_protest_with_hope:   { theme:'Protest auf der Straße mit Hoffnung', mood:['wut','freude'], notes:'', ef:'anger', es:'controlled_defiance' },
  faith_after_despair:        { theme:'Glaube nach der Verzweiflung', mood:['dankbar','trauer'], notes:'', ef:'sadness', es:'grief_with_release' },
  beautiful_last_evening:     { theme:'Der letzte schöne Abend', mood:['dankbar','trauer'], notes:'', ef:'sadness', es:'loss_with_gratitude' },
  national_disillusionment:   { theme:'Nationale Enttäuschung', mood:['wut','trauer'], notes:'', ef:'anger', es:'hurt_defiance' },
  divorce_papers_table:       { theme:'Scheidungspapiere auf dem Tisch', mood:['trauer','relief'], notes:'', ef:'sadness', es:'grief_with_release' },
  riot_after_injustice:       { theme:'Aufruhr nach der Ungerechtigkeit', mood:['wut','trauer'], notes:'', ef:'anger', es:'hurt_defiance' },
  immigrant_first_winter:     { theme:'Erster Winter als Immigrant', mood:['trauer','liebe'], notes:'', ef:'sadness', es:'grief_with_love' },
  brother_reconciliation:     { theme:'Versöhnung mit dem Bruder', mood:['liebe','trauer'], notes:'', ef:'love', es:'love_with_ache' },
  forgiveness_without_trust:  { theme:'Vergebung ohne Vertrauen', mood:['liebe','wut'], notes:'', ef:'love', es:'love_with_ache' },
  first_kiss_after_grief:     { theme:'Erster Kuss nach der Trauer', mood:['liebe','trauer'], notes:'', ef:'love', es:'love_with_ache' },
  worker_strike_solidarity:   { theme:'Streik und Solidarität', mood:['wut','freude'], notes:'', ef:'anger', es:'controlled_defiance' },
  bitter_ex_love:             { theme:'Verbitterte Ex-Liebe', mood:['wut','liebe'], notes:'', ef:'anger', es:'hurt_defiance' },
  political_speech_disgust:   { theme:'Ekel vor politischer Rede', mood:['wut'], notes:'', ef:'anger', es:'controlled_defiance' },
  caregiver_burnout:          { theme:'Burnout als Pflegeperson', mood:['trauer','wut'], notes:'', ef:'sadness', es:'restrained_grief' },
  forbidden_political_fear:   { theme:'Verbotene politische Angst', mood:['wut','trauer'], notes:'', ef:'anger', es:'hurt_defiance' },
  repaired_friendship:        { theme:'Reparierte Freundschaft', mood:['liebe','relief'], notes:'', ef:'love', es:'tender_attachment' },
  street_musician_resilience: { theme:'Straßenmusiker mit Widerstandskraft', mood:['freude','trauer'], notes:'', ef:'joy', es:'grief_with_release' },
  widowed_father_dinner:      { theme:'Verwitweter Vater beim Abendessen', mood:['trauer','liebe'], notes:'', ef:'sadness', es:'grief_with_love' },
  election_night_people:      { theme:'Wahlnacht mit dem Volk', mood:['freude','wut'], notes:'', ef:'anger', es:'controlled_defiance' },
  quiet_confidence_after_survival: { theme:'Stille Zuversicht nach dem Überleben', mood:['relief','dankbar'], notes:'trauer war tief', ef:'joy', es:'relief_after_pain' },
  mocked_dream:               { theme:'Verspotteter Traum', mood:['wut','trauer'], notes:'', ef:'anger', es:'hurt_defiance' },
  empty_church_after_service: { theme:'Leere Kirche nach dem Gottesdienst', mood:['dankbar','melanch'], notes:'', ef:'sadness', es:'loss_with_gratitude' },
  courtship_in_old_age:       { theme:'Werbung im Alter', mood:['liebe','dankbar'], notes:'', ef:'love', es:'tender_attachment' },
  betrayed_by_friend:         { theme:'Verrat durch den Freund', mood:['wut','trauer'], notes:'', ef:'anger', es:'hurt_defiance' },
  graveyard_spring:           { theme:'Friedhof im Frühling', mood:['trauer','dankbar'], notes:'', ef:'sadness', es:'loss_with_gratitude' },

  // ══ ROBUSTNESS 24 ════════════════════════════════════════════════
  // Unterteilt in: Paraphrase 10 · Adversarial 8 · Boundary 6
  // Keine Pipeline-Hacks vorab — reiner Generalisierungstest

  // ── Paraphrase 10 ──────────────────────────────────────────────
  // Semantisch gleich wie bekannte Cluster, aber lexikalisch anders formuliert
  free_breath_after_years:    { theme:'Nach Jahren wieder frei atmen', mood:['relief','trauer'], notes:'es war so lange so schwer', ef:'sadness', es:'grief_with_release' },
  mothers_things_in_box:      { theme:'Die letzten Dinge meiner Mutter im Karton', mood:['trauer','dankbar'], notes:'', ef:'sadness', es:'loss_with_gratitude' },
  courthouse_hallway_wait:    { theme:'Im Rathausflur nach dem Urteil warten', mood:['trauer','angst'], notes:'', ef:'sadness', es:'restrained_grief' },
  brother_drive_aimless:      { theme:'Bruderfahrt durchs Land ohne Ziel', mood:['freude','liebe'], notes:'', ef:'joy', es:'relieved_gladness' },
  village_mockery_still_hurts:{ theme:'Der Spott im Dorf sitzt noch tief', mood:['wut','trauer'], notes:'', ef:'anger', es:'hurt_defiance' },
  quiet_evening_after_care:   { theme:'Ein stiller Abend nach langer Pflege', mood:['melanch','dankbar'], notes:'', ef:'sadness', es:'restrained_grief' },
  spring_feels_like_survival: { theme:'Der Frühling fühlt sich nach Überleben an', mood:['relief','freude'], notes:'trauer lag lange', ef:'joy', es:'relief_after_pain' },
  old_teacher_empty_classroom:{ theme:'Der alte Lehrer allein im Klassenraum', mood:['melanch','dankbar'], notes:'', ef:'sadness', es:'loss_with_gratitude' },
  silence_after_breakup:      { theme:'Nach der Trennung endlich Ruhe im Zimmer', mood:['relief','trauer'], notes:'', ef:'joy', es:'grief_with_release' },
  grateful_for_what_was:      { theme:'Dankbar für das, was mit ihm war', mood:['trauer','dankbar'], notes:'er ist nicht mehr da', ef:'sadness', es:'loss_with_gratitude' },

  // ── Adversarial 8 ──────────────────────────────────────────────
  // Bewusst täuschend: Keyword-Fallen, die semantisch woanders landen
  love_but_i_resent_you:      { theme:'Liebe, aber ich verachte dich dafür', mood:['wut','liebe'], notes:'', ef:'anger', es:'hurt_defiance' },
  relief_that_feels_like_betrayal: { theme:'Erleichterung, die sich wie Verrat anfühlt', mood:['relief','trauer'], notes:'', ef:'sadness', es:'grief_with_release' },
  joy_in_protest_no_hope:     { theme:'Freude im Protest, aber keine Hoffnung', mood:['wut','freude'], notes:'', ef:'anger', es:'controlled_defiance' },
  gratitude_without_peace:    { theme:'Dankbarkeit ohne Frieden', mood:['dankbar','melanch'], notes:'der schmerz bleibt', ef:'sadness', es:'restrained_grief' },
  pride_despite_shame:        { theme:'Stolz trotz öffentlicher Scham', mood:['wut','trauer'], notes:'', ef:'anger', es:'hurt_defiance' },
  beautiful_day_threatening_end: { theme:'Ein schöner Tag mit drohendem Ende', mood:['dankbar','trauer'], notes:'', ef:'sadness', es:'loss_with_gratitude' },
  political_speech_causes_grief: { theme:'Politische Rede, die eher Trauer als Wut auslöst', mood:['trauer','melanch'], notes:'', ef:'sadness', es:'restrained_grief' },
  reunion_that_hurts_more:    { theme:'Wiedersehen, das mehr schmerzt als heilt', mood:['trauer','liebe'], notes:'', ef:'sadness', es:'grief_with_love' },

  // ── Boundary 6 ─────────────────────────────────────────────────
  // Grenzfälle zwischen nahen Shades oder Families
  letting_go_but_keeping_gift:{ theme:'Endlich lass ich ihn gehen, aber was er mir gab bleibt', mood:['trauer','dankbar'], notes:'erleichterung und dankbarkeit zugleich', ef:'sadness', es:'loss_with_gratitude' },
  long_fight_its_over_im_here:{ theme:'Nach dem langen Kampf: es ist vorbei, und ich bin noch hier', mood:['relief','trauer'], notes:'schmerz war lang', ef:'joy', es:'relief_after_pain' },
  silence_despite_hurt:       { theme:'Ich werde nicht schweigen, auch wenn es mich verletzt', mood:['wut','trauer'], notes:'', ef:'anger', es:'hurt_defiance' },
  laugh_with_you_like_home:   { theme:'Mit dir lachen ist wie Heimkommen', mood:['freude','liebe'], notes:'', ef:'love', es:'tender_attachment' },
  grief_with_him_inside_it:   { theme:'Ich vermisse ihn, aber in der Trauer steckt auch er', mood:['trauer','liebe'], notes:'', ef:'sadness', es:'grief_with_love' },
  angry_but_lost_the_cause:   { theme:'Ich bin wütend auf das System, aber ich weiß nicht mehr wofür ich kämpfe', mood:['wut','melanch'], notes:'', ef:'anger', es:'controlled_defiance' },
};

// ─── Cluster-Listen ──────────────────────────────────────────────
const TEST_CLUSTERS_CORE = [
  'young_summer_freedom','funny_flirt','simple_beautiful_day','autumn_after_breakup',
  'love_after_hard_times','first_child_birth','worker_pride','defiant_stand',
  'shame_in_family','guilt_and_repair','quiet_married_love','calm_morning_repair',
  'rural_summer_work','romantic_reunion_station','sacred_awe_in_nature','teenage_rebellion',
  'market_morning','hospital_waiting_room','religious_procession','pub_after_shift',
  'summer_storm_relief','neighborly_kindness','public_humiliation','athlete_comeback',
  'quiet_reading_evening','wedding_before_vows','bankruptcy_notice','childhood_bicycle',
  'festival_euphoria','office_window_burnout'
];

const TEST_CLUSTERS_NUANCE = [
  'cool_city_night','friends_summer_night','city_ambition','mother_kitchen_memory',
  'lonely_hotel_room','cool_but_lonely','old_age_garden','schoolyard_exclusion',
  'new_job_first_day','father_son_distance','deserted_train_station','secret_affair',
  'funny_masked_pain','teacher_after_class','spring_after_depression','soldier_homecoming_distance',
  'artistic_block','nurse_night_shift','seaside_after_argument','widower_morning',
  'late_night_radio_host','midlife_restlessness','dog_after_owner_loss','mountain_climb_exhaustion',
  'small_town_gossip','road_trip_brothers','newly_single_apartment','rainy_window_city',
  'playground_parenthood','midnight_gas_station','library_refuge','night_train_departure',
  'retirement_last_shift','birthday_without_person','snow_morning_peace','graduation_departure',
  'bank_of_river_regret','crowded_subway_detachment','first_paycheck_home','first_solo_trip'
];

const TEST_CLUSTERS_CONFLICT = [
  'grief_with_release_case','parting_with_relief_case','loss_with_gratitude',
  'jealous_possessive_love','political_discontent','street_protest_with_hope',
  'faith_after_despair','beautiful_last_evening','national_disillusionment',
  'divorce_papers_table','riot_after_injustice','immigrant_first_winter',
  'brother_reconciliation','forgiveness_without_trust','first_kiss_after_grief',
  'worker_strike_solidarity','bitter_ex_love','political_speech_disgust',
  'caregiver_burnout','forbidden_political_fear','repaired_friendship',
  'street_musician_resilience','widowed_father_dinner','election_night_people',
  'quiet_confidence_after_survival','mocked_dream','empty_church_after_service',
  'courtship_in_old_age','betrayed_by_friend','graveyard_spring'
];

const TEST_CLUSTERS_ROBUSTNESS_PARAPHRASE = [
  'free_breath_after_years','mothers_things_in_box','courthouse_hallway_wait',
  'brother_drive_aimless','village_mockery_still_hurts','quiet_evening_after_care',
  'spring_feels_like_survival','old_teacher_empty_classroom','silence_after_breakup',
  'grateful_for_what_was'
];

const TEST_CLUSTERS_ROBUSTNESS_ADVERSARIAL = [
  'love_but_i_resent_you','relief_that_feels_like_betrayal','joy_in_protest_no_hope',
  'gratitude_without_peace','pride_despite_shame','beautiful_day_threatening_end',
  'political_speech_causes_grief','reunion_that_hurts_more'
];

const TEST_CLUSTERS_ROBUSTNESS_BOUNDARY = [
  'letting_go_but_keeping_gift','long_fight_its_over_im_here','silence_despite_hurt',
  'laugh_with_you_like_home','grief_with_him_inside_it','angry_but_lost_the_cause'
];

const TEST_CLUSTERS_ROBUSTNESS = [
  ...TEST_CLUSTERS_ROBUSTNESS_PARAPHRASE,
  ...TEST_CLUSTERS_ROBUSTNESS_ADVERSARIAL,
  ...TEST_CLUSTERS_ROBUSTNESS_BOUNDARY,
];

// ─── Test-Runner ─────────────────────────────────────────────────
function runTests(level = 'core') {
  if (typeof buildEmotionSignalBundle !== 'function') {
    console.error('[Tests] buildEmotionSignalBundle nicht verfügbar. Pipeline laden.');
    return null;
  }

  let ids = [];
  if (level === 'core')        ids = TEST_CLUSTERS_CORE;
  if (level === 'nuance')      ids = TEST_CLUSTERS_NUANCE;
  if (level === 'conflict')    ids = [...TEST_CLUSTERS_CORE, ...TEST_CLUSTERS_CONFLICT];
  if (level === 'all')         ids = [...TEST_CLUSTERS_CORE, ...TEST_CLUSTERS_NUANCE, ...TEST_CLUSTERS_CONFLICT];
  if (level === 'robustness')  ids = TEST_CLUSTERS_ROBUSTNESS;
  if (level === 'rob_para')    ids = TEST_CLUSTERS_ROBUSTNESS_PARAPHRASE;
  if (level === 'rob_adv')     ids = TEST_CLUSTERS_ROBUSTNESS_ADVERSARIAL;
  if (level === 'rob_bound')   ids = TEST_CLUSTERS_ROBUSTNESS_BOUNDARY;

  const results = { pass: [], fail: [], total: ids.length };

  ids.forEach(id => {
    const def = CLUSTER_DEFS[id];
    if (!def) { results.fail.push({ id, reason: 'Definition fehlt' }); return; }

    const state = { lang: 'de', mood: def.mood || [], theme: def.theme || '', notes: def.notes || '', genre: [], personas: [], structure: '' };
    const bundle = buildEmotionSignalBundle(state, true);
    const family = bundle.emotionState.primaryFamily;
    const shade  = bundle.emotionState.primaryShade;
    const scores = bundle.emotionState.debugScores || {};
    const hints  = bundle.emotionState.debugThemeHints || {};

    const familyOk = family === def.ef;
    const shadeOk  = shade  === def.es;

    if (familyOk && shadeOk) {
      results.pass.push({ id, family, shade });
    } else {
      // Diagnose: warum scheitert der Fall?
      const topScore    = Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];
      const themeHitAny = hints.hits ? Object.values(hints.hits).flat().length > 0 : false;
      const cause = !familyOk
        ? (themeHitAny ? 'theme_hint_wrong_family' : 'theme_miss')
        : 'shade_too_flat';

      results.fail.push({
        id, family, shade, ef: def.ef, es: def.es,
        reason: !familyOk ? `family: ${family} ≠ ${def.ef}` : `shade: ${shade} ≠ ${def.es}`,
        cause,
        topScore: topScore ? `${topScore[0]}:${topScore[1].toFixed(1)}` : '?',
        themeHits: themeHitAny ? Object.entries(hints.hits).filter(([,a])=>a.length>0).map(([f,a])=>`${f}:${a[0]}`).join(',') : 'none',
        theme: def.theme,
      });
    }
  });

  // Zusammenfassung nach Ursache gruppiert
  const passRate = ((results.pass.length / results.total) * 100).toFixed(1);
  console.log(`\n╔══ HIRSCH PIPELINE TESTS (${level.toUpperCase()}) ══════════════════`);
  console.log(`║  Total: ${results.total} | Pass: ${results.pass.length} | Fail: ${results.fail.length} | Rate: ${passRate}%`);
  if (results.fail.length > 0) {
    const byCause = {};
    results.fail.forEach(f => { (byCause[f.cause] = byCause[f.cause] || []).push(f); });
    Object.entries(byCause).forEach(([cause, cases]) => {
      console.log(`║  ── ${cause} (${cases.length}) ──────────────────────`);
      cases.forEach(f => {
        const hint = f.themeHits !== 'none' ? ` [hint:${f.themeHits}]` : ` [no hint — theme:"${f.theme}"]`;
        console.log(`║  ❌ ${f.id}: ${f.reason}${hint}`);
      });
    });
  }
  console.log(`╚${'═'.repeat(54)}`);

  return results;
}

// ─── Globale Exports ─────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.HIRSCH_TESTS = { runTests, CLUSTER_DEFS, TEST_CLUSTERS_CORE, TEST_CLUSTERS_NUANCE, TEST_CLUSTERS_CONFLICT, TEST_CLUSTERS_ROBUSTNESS, TEST_CLUSTERS_ROBUSTNESS_PARAPHRASE, TEST_CLUSTERS_ROBUSTNESS_ADVERSARIAL, TEST_CLUSTERS_ROBUSTNESS_BOUNDARY };
}
if (typeof module !== 'undefined') {
  module.exports = { runTests, CLUSTER_DEFS, TEST_CLUSTERS_CORE, TEST_CLUSTERS_NUANCE, TEST_CLUSTERS_CONFLICT, TEST_CLUSTERS_ROBUSTNESS, TEST_CLUSTERS_ROBUSTNESS_PARAPHRASE, TEST_CLUSTERS_ROBUSTNESS_ADVERSARIAL, TEST_CLUSTERS_ROBUSTNESS_BOUNDARY };
}
