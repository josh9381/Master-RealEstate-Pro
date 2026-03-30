import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/auth/register"
          className="inline-flex items-center text-sm text-primary hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Register
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last updated: March 4, 2026
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
            <h3 className="text-lg font-semibold">1. Acceptance of Terms</h3>
            <p className="text-muted-foreground">
              By accessing or using Master RealEstate Pro ("the Service"), you agree to be bound by these 
              Terms of Service. If you do not agree, you may not use the Service.
            </p>

            <h3 className="text-lg font-semibold">2. Description of Service</h3>
            <p className="text-muted-foreground">
              Master RealEstate Pro provides a customer relationship management (CRM) platform designed 
              for real estate professionals, including lead management, communication tools, analytics, 
              and AI-powered features.
            </p>

            <h3 className="text-lg font-semibold">3. User Accounts</h3>
            <p className="text-muted-foreground">
              You are responsible for maintaining the security of your account credentials. You must 
              provide accurate information during registration and keep it up to date. You are responsible 
              for all activity that occurs under your account.
            </p>

            <h3 className="text-lg font-semibold">4. Privacy</h3>
            <p className="text-muted-foreground">
              Your use of the Service is subject to our Privacy Policy. By using the Service, you consent 
              to the collection and use of information as described in our Privacy Policy.
            </p>

            <h3 className="text-lg font-semibold">5. Acceptable Use</h3>
            <p className="text-muted-foreground">
              You agree not to use the Service for any unlawful purpose or in any way that could damage, 
              disable, or impair the Service. You must comply with all applicable laws including CAN-SPAM, 
              TCPA, and GDPR where applicable.
            </p>

            <h3 className="text-lg font-semibold">6. Data Ownership</h3>
            <p className="text-muted-foreground">
              You retain all rights to the data you upload to the Service. We do not claim ownership of 
              your content. You grant us a limited license to process your data solely to provide the Service.
            </p>

            <h3 className="text-lg font-semibold">7. Limitation of Liability</h3>
            <p className="text-muted-foreground">
              The Service is provided "as is" without warranties of any kind. We shall not be liable for 
              any indirect, incidental, or consequential damages arising from your use of the Service.
            </p>

            <h3 className="text-lg font-semibold">8. Changes to Terms</h3>
            <p className="text-muted-foreground">
              We reserve the right to modify these terms at any time. We will notify you of material 
              changes via email or in-app notification. Continued use of the Service after changes 
              constitutes acceptance of the updated terms.
            </p>

            <h3 className="text-lg font-semibold">9. Contact</h3>
            <p className="text-muted-foreground">
              If you have questions about these Terms, please contact us through the Help Center in the application.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;
