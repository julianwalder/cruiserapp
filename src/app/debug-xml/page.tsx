'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugXMLPage() {
  const [xmlContent, setXmlContent] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testXML = `<?xml version="1.0" encoding="UTF-8"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"         xmlns:ccts="urn:un:unece:uncefact:documentation:2"         xmlns:qdt="urn:oasis:names:specification:ubl:schema:xsd:QualifiedDataTypes-2"         xmlns:udt="urn:oasis:names:specification:ubl:schema:xsd:UnqualifiedDataTypes-2">  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>  <cbc:ID>CA0766</cbc:ID>  <cbc:IssueDate>2025-03-04</cbc:IssueDate>  <cbc:DueDate>2025-03-11</cbc:DueDate>  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>  <cbc:TaxPointDate>2025-03-04</cbc:TaxPointDate>  <cbc:DocumentCurrencyCode>RON</cbc:DocumentCurrencyCode>  <cac:AccountingSupplierParty>    <cac:Party>      <cbc:EndpointID schemeID="EM">tower@cruiseraviation.ro</cbc:EndpointID>      <cac:PostalAddress>        <cbc:StreetName>Sos. Bucuresti-Ploiesti  19-21 Tronson 2, Birou R.14, Etaj 6 Cod Poștal 013682</cbc:StreetName>        <cbc:CityName>SECTOR1</cbc:CityName>        <cbc:CountrySubentity>RO-B</cbc:CountrySubentity>        <cac:Country>          <cbc:IdentificationCode>RO</cbc:IdentificationCode>        </cac:Country>      </cac:PostalAddress>      <cac:PartyTaxScheme>        <cbc:CompanyID>RO39767581</cbc:CompanyID>        <cac:TaxScheme>          <cbc:ID>VAT</cbc:ID>        </cac:TaxScheme>      </cac:PartyTaxScheme>      <cac:PartyLegalEntity>        <cbc:RegistrationName>CRUISER AVIATION SRL</cbc:RegistrationName>        <cbc:CompanyID>J40/11881/2018</cbc:CompanyID>        <cbc:CompanyLegalForm>Capital social: 45.000 Lei lei</cbc:CompanyLegalForm>      </cac:PartyLegalEntity>      <cac:Contact>        <cbc:Name>Julian Walder</cbc:Name>        <cbc:Telephone>0722500163</cbc:Telephone>        <cbc:ElectronicMail>tower@cruiseraviation.ro</cbc:ElectronicMail>      </cac:Contact>    </cac:Party>  </cac:AccountingSupplierParty>  <cac:AccountingCustomerParty>    <cac:Party>      <cbc:EndpointID schemeID="EM">s.avadanei@yahoo.com</cbc:EndpointID>      <cac:PostalAddress>        <cbc:StreetName>Str.Anastasie Crimca nr.1 b.1 sc. C et.4 ap.19</cbc:StreetName>        <cbc:CityName>Suceava</cbc:CityName>        <cbc:CountrySubentity>RO-SV</cbc:CountrySubentity>        <cac:Country>          <cbc:IdentificationCode>RO</cbc:IdentificationCode>        </cac:Country>      </cac:PostalAddress>      <cac:PartyLegalEntity>        <cbc:RegistrationName>Ștefan Avădănei</cbc:RegistrationName>        <cbc:CompanyID>5010723225621</cbc:CompanyID>      </cac:PartyLegalEntity>      <cac:Contact>        <cbc:Telephone>+40 (748) 023 575</cbc:Telephone>        <cbc:ElectronicMail>s.avadanei@yahoo.com</cbc:ElectronicMail>      </cac:Contact>    </cac:Party>  </cac:AccountingCustomerParty>  <cac:PaymentMeans>    <cbc:PaymentMeansCode>42</cbc:PaymentMeansCode>    <cbc:PaymentID>CA0766</cbc:PaymentID>    <cac:PayeeFinancialAccount>      <cbc:ID>RO52REVO0000385568076800</cbc:ID>      <cbc:Name>CONT REVOLUT BANK IN RON</cbc:Name>      <cac:FinancialInstitutionBranch>        <cbc:ID>REVOROBB</cbc:ID>      </cac:FinancialInstitutionBranch>    </cac:PayeeFinancialAccount>  </cac:PaymentMeans>  <cac:TaxTotal>    <cbc:TaxAmount currencyID="RON">3079.20</cbc:TaxAmount>    <cac:TaxSubtotal>      <cbc:TaxableAmount currencyID="RON">16206.30</cbc:TaxableAmount>      <cbc:TaxAmount currencyID="RON">3079.20</cbc:TaxAmount>      <cac:TaxCategory>        <cbc:ID>S</cbc:ID>        <cbc:Percent>19.00</cbc:Percent>        <cac:TaxScheme>          <cbc:ID>VAT</cbc:ID>        </cac:TaxScheme>      </cac:TaxCategory>    </cac:TaxSubtotal>  </cac:TaxTotal>  <cac:LegalMonetaryTotal>    <cbc:LineExtensionAmount currencyID="RON">16206.30</cbc:LineExtensionAmount>    <cbc:TaxExclusiveAmount currencyID="RON">16206.30</cbc:TaxExclusiveAmount>    <cbc:TaxInclusiveAmount currencyID="RON">19285.50</cbc:TaxInclusiveAmount>    <cbc:AllowanceTotalAmount currencyID="RON">0.00</cbc:AllowanceTotalAmount>    <cbc:ChargeTotalAmount currencyID="RON">0</cbc:ChargeTotalAmount>    <cbc:PrepaidAmount currencyID="RON">0</cbc:PrepaidAmount>    <cbc:PayableRoundingAmount currencyID="RON">0.00</cbc:PayableRoundingAmount>    <cbc:PayableAmount currencyID="RON">19285.50</cbc:PayableAmount>  </cac:LegalMonetaryTotal>  <cac:InvoiceLine>    <cbc:ID>1</cbc:ID>    <cbc:InvoicedQuantity unitCode="HUR">25.0000</cbc:InvoicedQuantity>    <cbc:LineExtensionAmount currencyID="RON">16206.30</cbc:LineExtensionAmount>    <cac:Item>      <cbc:Description>Ofertă 2024</cbc:Description>      <cbc:Name>Ora de zbor (combustibil inclus)</cbc:Name>      <cac:ClassifiedTaxCategory>        <cbc:ID>S</cbc:ID>        <cbc:Percent>19.00</cbc:Percent>        <cac:TaxScheme>          <cbc:ID>VAT</cbc:ID>        </cac:TaxScheme>      </cac:ClassifiedTaxCategory>    </cac:Item>    <cac:Price>      <cbc:PriceAmount currencyID="RON">648.25</cbc:PriceAmount>      <cbc:BaseQuantity unitCode="HUR">1</cbc:BaseQuantity>    </cac:Price>  </cac:InvoiceLine>  <cac:InvoiceLine>    <cbc:ID>2</cbc:ID>    <cbc:InvoicedQuantity unitCode="HUR">5.0000</cbc:InvoicedQuantity>    <cbc:LineExtensionAmount currencyID="RON">0.00</cbc:LineExtensionAmount>    <cac:Item>      <cbc:Description>Ofertă 5 Ani Cruiser Aviation 25+5</cbc:Description>      <cbc:Name>Ora de zbor promo (combustibil inclus)</cbc:Name>      <cac:ClassifiedTaxCategory>        <cbc:ID>S</cbc:ID>        <cbc:Percent>19.00</cbc:Percent>        <cac:TaxScheme>          <cbc:ID>VAT</cbc:ID>        </cac:TaxScheme>      </cac:ClassifiedTaxCategory>    </cac:Item>    <cac:Price>      <cbc:PriceAmount currencyID="RON">0.00</cbc:PriceAmount>      <cbc:BaseQuantity unitCode="HUR">1</cbc:BaseQuantity>    </cac:Price>  </cac:InvoiceLine></Invoice>`;

  const handleTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug-xml', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ xmlContent: xmlContent || testXML }),
      });

      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        console.log('✅ XML parsed successfully:', data.parsedInvoice);
      } else {
        console.error('❌ XML parsing failed:', data.error);
      }
    } catch (error) {
      console.error('❌ Request failed:', error);
      setResult({ success: false, error: 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">XML Parser Debug</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>XML Content</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={xmlContent}
            onChange={(e) => setXmlContent(e.target.value)}
            placeholder="Paste your XML here or use the test button"
            rows={10}
            className="font-mono text-sm"
          />
          <div className="mt-4 space-x-2">
            <Button onClick={handleTest} disabled={loading}>
              {loading ? 'Testing...' : 'Test XML Parsing'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setXmlContent(testXML)}
              disabled={loading}
            >
              Load Test XML
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <div className="text-sm text-gray-600">
        <p>💡 Check the browser console (F12 → Console) for detailed debug output</p>
        <p>🔍 Look for logs starting with "=== XML PARSER DEBUG START ==="</p>
      </div>
    </div>
  );
} 