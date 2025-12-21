const { createClient } = require('@supabase/supabase-js');

/**
 * update-company.js
 * 
 * Finalizes company creation and inserts the initial Hub record.
 * Matches specific database schema: 
 * - Cities: uses 'city_name' and 'normalized_name'
 * - Hubs: uses 'owner_id', 'city_name', 'country_name', 'country_code', 'geom'
 */
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = JSON.parse(event.body);
    const { email, company_name, hub_name, hub_country, capital, balance } = body;
    
    if (!email) throw new Error('Email is required');

    const cleanEmail = String(email).toLowerCase().trim();
    // Use normalized name for safer database lookup
    const normalizedCitySearch = String(hub_name).toLowerCase().trim();

    console.log(`[UpdateCompany] Finalizing for: ${cleanEmail}, Hub: ${hub_name}`);

    // 1. Fetch City Data from public.cities using the correct column names
    const { data: cityData, error: cityQueryError } = await supabase
      .from('cities')
      .select('*')
      .eq('normalized_name', normalizedCitySearch)
      .maybeSingle();

    if (cityQueryError) console.warn('[UpdateCompany] City lookup error:', cityQueryError);
    if (!cityData) console.warn(`[UpdateCompany] No city found in DB for: ${normalizedCitySearch}`);

    // 2. Update Company
    const { data: updatedCompanies, error: updateError } = await supabase
      .from('companies')
      .update({
        name: company_name,
        hub_name: hub_name,
        hub_country: hub_country,
        capital: capital || 10000,
        balance: balance || capital || 10000,
        level: 'startup',
        updated_at: new Date().toISOString()
      })
      .eq('email', cleanEmail)
      .select();

    if (updateError) throw updateError;
    if (!updatedCompanies || updatedCompanies.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Company not found' }) };
    }

    const company = updatedCompanies[0];
    const ownerId = company.owner_id;

    // 3. Insert Main Hub with full geographical enrichment
    const { error: hubError } = await supabase
      .from('hubs')
      .insert({
        owner_id: ownerId,
        name: `${company_name} HQ`,
        city: hub_name,
        country: hub_country,
        // Geographical Enrichment from cityData
        lat: cityData?.lat || null,
        lon: cityData?.lon || null,
        country_code: cityData?.country_code || null,
        country_name: cityData?.country_name || hub_country,
        city_id: cityData?.id || null,
        geom: cityData?.geom || null, // Transfer the PostGIS geometry if it exists
        hub_level: 1,
        data: { 
          is_main: true, 
          capacity: 5,
          founded_at: new Date().toISOString(),
          city_idx: cityData?.idx || null
        }
      });

    if (hubError) {
      console.error('[UpdateCompany] Hub Insert Error:', hubError);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        company: company,
        hubCreated: !hubError,
        enriched: !!cityData,
        matched_city_id: cityData?.id || null
      }),
    };
  } catch (error) {
    console.error('[UpdateCompany] Error:', error.message);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
};