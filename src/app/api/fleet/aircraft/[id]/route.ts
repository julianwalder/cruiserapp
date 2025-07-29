import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/lib/middleware';
import { getSupabaseClient } from '@/lib/supabase';

// GET /api/fleet/aircraft/[id] - Get aircraft by ID
async function getAircraft(request: NextRequest, currentUser: any) {
  try {
    const aircraftId = request.nextUrl.pathname.split('/').pop();

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    const { data: aircraft, error } = await supabase
      .from('aircraft')
      .select(`
        id,
        "registrationNumber",
        "icaoType",
        manufacturer,
        model,
        type,
        status,
        "yearOfManufacture",
        "totalFlightHours",
        "lastMaintenanceDate",
        "nextMaintenanceDate",
        "insuranceExpiryDate",
        "registrationExpiryDate",
        "imagePath",
        "createdAt",
        "updatedAt"
      `)
      .eq('id', aircraftId)
      .single();

    if (error || !aircraft) {
      return NextResponse.json(
        { error: 'Aircraft not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(aircraft);
  } catch (error) {
    console.error('Error fetching aircraft:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/fleet/aircraft/[id] - Update aircraft
async function updateAircraft(request: NextRequest, currentUser: any) {
  try {
    const aircraftId = request.nextUrl.pathname.split('/').pop();
    
    // Check if the request is FormData or JSON
    const contentType = request.headers.get('content-type') || '';
    
    let body: any = {};
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData
      const formData = await request.formData();
      
      // Convert FormData to object and handle file uploads
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          // Handle file upload
          console.log('File received:', key, value.name);
          
          // Upload to Vercel Blob
          const { put } = await import('@vercel/blob');
          
          const timestamp = Date.now();
          const extension = value.name.split('.').pop();
          const filename = `aircraft-${timestamp}.${extension}`;
          
          const blob = await put(filename, value, {
            access: 'public',
            addRandomSuffix: false,
          });
          
          body[key] = blob.url;
        } else {
          body[key] = value as string;
        }
      }
      
      console.log('FormData body:', body);
    } else {
      // Handle JSON
      const rawBody = await request.text();
      console.log('Raw JSON body:', rawBody);
      
      try {
        body = JSON.parse(rawBody);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw body that failed to parse:', rawBody);
        return NextResponse.json(
          { error: 'Invalid JSON in request body' },
          { status: 400 }
        );
      }
    }

    // Map FormData fields to database fields
    const updateData: any = {
      callSign: body.callSign || body.registrationNumber,
      serialNumber: body.serialNumber,
      yearOfManufacture: body.yearOfManufacture ? parseInt(body.yearOfManufacture) : null,
      status: body.status || 'ACTIVE',
      updatedAt: new Date().toISOString(),
    };

    // Add image path if a new image was uploaded
    if (body.image) {
      updateData.imagePath = body.image;
    }

    // Validate required fields
    if (!updateData.callSign || !body.manufacturer || !body.model) {
      return NextResponse.json(
        { error: 'Call sign, manufacturer, and model are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    // Check if aircraft exists
    const { data: existingAircraft, error: existingError } = await supabase
      .from('aircraft')
      .select('id, "callSign"')
      .eq('id', aircraftId)
      .single();

    if (existingError || !existingAircraft) {
      return NextResponse.json(
        { error: 'Aircraft not found' },
        { status: 404 }
      );
    }

    // Check if call sign is already taken by another aircraft
    const { data: duplicateAircraft, error: duplicateError } = await supabase
      .from('aircraft')
      .select('id')
      .eq('callSign', updateData.callSign)
      .neq('id', aircraftId)
      .single();

    if (duplicateError && duplicateError.code !== 'PGRST116') {
      console.error('Error checking duplicate aircraft:', duplicateError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    if (duplicateAircraft) {
      return NextResponse.json(
        { error: 'Aircraft with this call sign already exists' },
        { status: 409 }
      );
    }

    // Find the ICAO reference type if provided
    let icaoReferenceTypeId = null;
    if (body.icaoTypeDesignator && body.manufacturer && body.model) {
      const { data: icaoRef, error: icaoError } = await supabase
        .from('icao_reference_type')
        .select('id')
        .eq('typeDesignator', body.icaoTypeDesignator)
        .eq('manufacturer', body.manufacturer)
        .eq('model', body.model)
        .single();

      if (!icaoError && icaoRef) {
        icaoReferenceTypeId = icaoRef.id;
      }
    }

    // Update aircraft
    const { data: aircraft, error: updateError } = await supabase
      .from('aircraft')
      .update({
        callSign: updateData.callSign,
        serialNumber: updateData.serialNumber,
        yearOfManufacture: updateData.yearOfManufacture,
        status: updateData.status,
        icaoReferenceTypeId: icaoReferenceTypeId,
        imagePath: updateData.imagePath, // Add the image path
        updatedAt: updateData.updatedAt,
      })
      .eq('id', aircraftId)
      .select(`
        *,
        icao_reference_type (
          id,
          "typeDesignator",
          manufacturer,
          model
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating aircraft:', updateError);
      return NextResponse.json(
        { error: 'Failed to update aircraft' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Aircraft updated successfully',
      aircraft: {
        ...aircraft,
        icaoReferenceType: aircraft.icao_reference_type,
      },
    });
  } catch (error) {
    console.error('Error updating aircraft:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/fleet/aircraft/[id] - Delete aircraft
async function deleteAircraft(request: NextRequest, currentUser: any) {
  try {
    const aircraftId = request.nextUrl.pathname.split('/').pop();

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

    // Check if aircraft exists
    const { data: existingAircraft, error: existingError } = await supabase
      .from('aircraft')
      .select('id, "registrationNumber"')
      .eq('id', aircraftId)
      .single();

    if (existingError || !existingAircraft) {
      return NextResponse.json(
        { error: 'Aircraft not found' },
        { status: 404 }
      );
    }

    // Delete aircraft
    const { error: deleteError } = await supabase
      .from('aircraft')
      .delete()
      .eq('id', aircraftId);

    if (deleteError) {
      console.error('Error deleting aircraft:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete aircraft' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Aircraft deleted successfully',
      aircraft: {
        id: existingAircraft.id,
        registrationNumber: existingAircraft.registrationNumber,
      },
    });
  } catch (error) {
    console.error('Error deleting aircraft:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export handlers with middleware
export const GET = requireAnyRole(['ADMIN', 'BASE_MANAGER'])(getAircraft);
export const PUT = requireAnyRole(['ADMIN', 'BASE_MANAGER'])(updateAircraft);
export const DELETE = requireAnyRole(['ADMIN', 'BASE_MANAGER'])(deleteAircraft); 