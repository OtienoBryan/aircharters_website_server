#!/bin/bash

# Payment System Test Runner
# This script helps test the payment system implementation

echo "🚀 Air Charters Payment System Test Runner"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the air_backend directory."
    exit 1
fi

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
}

# Function to check environment variables
check_env() {
    print_status "Checking environment variables..."
    
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_warning "Please update .env file with your actual configuration"
        else
            print_error ".env.example not found. Please create a .env file manually."
            exit 1
        fi
    fi
    
    # Check for required environment variables
    required_vars=("STRIPE_SECRET_KEY" "MPESA_CONSUMER_KEY" "MPESA_CONSUMER_SECRET")
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env; then
            print_warning "Missing $var in .env file"
        fi
    done
}

# Function to run unit tests
run_unit_tests() {
    print_status "Running unit tests..."
    npm run test:unit
    if [ $? -eq 0 ]; then
        print_success "Unit tests passed"
    else
        print_error "Unit tests failed"
        return 1
    fi
}

# Function to run e2e tests
run_e2e_tests() {
    print_status "Running e2e tests..."
    npm run test:e2e
    if [ $? -eq 0 ]; then
        print_success "E2E tests passed"
    else
        print_error "E2E tests failed"
        return 1
    fi
}

# Function to start the server
start_server() {
    print_status "Starting the server..."
    npm run start:dev &
    SERVER_PID=$!
    
    # Wait for server to start
    print_status "Waiting for server to start..."
    sleep 10
    
    # Check if server is running
    if curl -s http://localhost:3000/api/health > /dev/null; then
        print_success "Server is running on http://localhost:3000"
        return 0
    else
        print_error "Server failed to start"
        kill $SERVER_PID 2>/dev/null
        return 1
    fi
}

# Function to stop the server
stop_server() {
    if [ ! -z "$SERVER_PID" ]; then
        print_status "Stopping server..."
        kill $SERVER_PID 2>/dev/null
        print_success "Server stopped"
    fi
}

# Function to run Postman tests
run_postman_tests() {
    print_status "Postman collection created: PAYMENT-TESTING-POSTMAN-COLLECTION.json"
    print_status "To test with Postman:"
    echo "1. Import the collection into Postman"
    echo "2. Update the base_url variable if needed"
    echo "3. Run the tests in order:"
    echo "   - Authentication Setup"
    echo "   - Create Test Booking"
    echo "   - Payment Provider Tests"
    echo "   - Unified Payment System Tests"
    echo "   - Legacy Payment System Tests"
    echo "   - Error Handling Tests"
}

# Function to show test results
show_test_results() {
    echo ""
    echo "📊 Test Results Summary"
    echo "======================"
    echo "✅ Unit Tests: $UNIT_TEST_RESULT"
    echo "✅ E2E Tests: $E2E_TEST_RESULT"
    echo "✅ Server Status: $SERVER_STATUS"
    echo ""
    echo "🔧 Next Steps:"
    echo "1. Import PAYMENT-TESTING-POSTMAN-COLLECTION.json into Postman"
    echo "2. Update environment variables in .env file"
    echo "3. Run the Postman collection tests"
    echo "4. Review test results and fix any issues"
}

# Main execution
main() {
    case "$1" in
        "install")
            install_dependencies
            ;;
        "check")
            check_env
            ;;
        "unit")
            run_unit_tests
            ;;
        "e2e")
            run_e2e_tests
            ;;
        "server")
            start_server
            ;;
        "postman")
            run_postman_tests
            ;;
        "all")
            install_dependencies
            check_env
            run_unit_tests
            UNIT_TEST_RESULT="PASSED"
            if start_server; then
                SERVER_STATUS="RUNNING"
                run_e2e_tests
                E2E_TEST_RESULT="PASSED"
                stop_server
            else
                SERVER_STATUS="FAILED"
                E2E_TEST_RESULT="SKIPPED"
            fi
            run_postman_tests
            show_test_results
            ;;
        "help"|"")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  install   - Install dependencies"
            echo "  check     - Check environment configuration"
            echo "  unit      - Run unit tests"
            echo "  e2e       - Run e2e tests"
            echo "  server    - Start the server"
            echo "  postman   - Show Postman testing instructions"
            echo "  all       - Run all tests and setup"
            echo "  help      - Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 install    # Install dependencies"
            echo "  $0 all        # Run complete test suite"
            echo "  $0 server     # Start server for manual testing"
            ;;
        *)
            print_error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Trap to stop server on script exit
trap stop_server EXIT

# Run main function with all arguments
main "$@"
