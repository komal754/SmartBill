package main

import (
	"crypto/rand"
	"math/big"
	"time"

	"encoding/json"

	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"

	// Generate a 6-digit OTP

	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"github.com/gin-contrib/cors" 
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/razorpay/razorpay-go"
	"golang.org/x/crypto/bcrypt"
)

func generateOTP() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

// Send OTP email using SendGrid
func sendOTPEmail(toEmail, otp string) error {
	from := mail.NewEmail("SmartBill", os.Getenv("SENDGRID_FROM_EMAIL"))
	subject := "Your SmartBill OTP Verification Code"
	to := mail.NewEmail("User", toEmail)
	plainTextContent := fmt.Sprintf("Your OTP code is: %s\nIt is valid for 10 minutes.", otp)
	message := mail.NewSingleEmail(from, subject, to, plainTextContent, "")
	client := sendgrid.NewSendClient(os.Getenv("SENDGRID_API_KEY"))
	_, err := client.Send(message)
	return err
}

type User struct {
	ID       int     `json:"id"`
	Username string  `json:"username"`
	Password string  `json:"-"` // hashed
	Budget   float64 `json:"budget"`
}

type Expense struct {
	ID            int       `json:"id"`
	UserID        int       `json:"user_id"`
	Date          time.Time `json:"date"`
	Category      string    `json:"category"`
	Amount        float64   `json:"amount"`
	PaymentStatus string    `json:"payment_status"`
	Description   string    `json:"description"`
	Paid          bool      `json:"paid"`
}

// MarshalJSON for Expense to format Date as YYYY-MM-DD using encoding/json
func (e Expense) MarshalJSON() ([]byte, error) {
	return json.Marshal(&struct {
		ID            int     `json:"id"`
		UserID        int     `json:"user_id"`
		Date          string  `json:"date"`
		Category      string  `json:"category"`
		Amount        float64 `json:"amount"`
		PaymentStatus string  `json:"payment_status"`
		Description   string  `json:"description"`
		Paid          bool    `json:"paid"`
	}{
		ID:            e.ID,
		UserID:        e.UserID,
		Date:          e.Date.Format("2006-01-02"),
		Category:      e.Category,
		Amount:        e.Amount,
		PaymentStatus: e.PaymentStatus,
		Description:   e.Description,
		Paid:          e.Paid,
	})
}

type Payment struct {
	ID          int       `json:"id"`
	UserID      int       `json:"user_id"`
	PaymentDate time.Time `json:"payment_date"`
	Amount      float64   `json:"amount"`
	ExpenseID   *int      `json:"expense_id"`
	Category    *string   `json:"category,omitempty"`
	Description *string   `json:"description,omitempty"`
}

// MarshalJSON for Payment to format PaymentDate as YYYY-MM-DD and handle nullable ExpenseID, Category, Description
func (p Payment) MarshalJSON() ([]byte, error) {
	var expenseID interface{}
	if p.ExpenseID != nil {
		expenseID = *p.ExpenseID
	} else {
		expenseID = nil
	}
	var category string
	if p.Category != nil {
		category = *p.Category
	} else {
		category = ""
	}
	var description string
	if p.Description != nil {
		description = *p.Description
	} else {
		description = ""
	}
	return json.Marshal(&struct {
		ID          int         `json:"id"`
		UserID      int         `json:"user_id"`
		PaymentDate string      `json:"payment_date"`
		Amount      float64     `json:"amount"`
		ExpenseID   interface{} `json:"expense_id"`
		Category    string      `json:"category,omitempty"`
		Description string      `json:"description,omitempty"`
	}{
		ID:          p.ID,
		UserID:      p.UserID,
		PaymentDate: p.PaymentDate.Format("2006-01-02"),
		Amount:      p.Amount,
		ExpenseID:   expenseID,
		Category:    category,
		Description: description,
	})
}

var (
	// users    = []User{}
	// usersMu  sync.Mutex
	// userID   = 1
	jwtKey = []byte("your_secret_key")
	db     *pgxpool.Pool
	// expenses = []Expense{
	// 	{ID: 1, UserID: 1, Date: "2025-08-15", Category: "Food", Amount: 250, Description: "Lunch"},
	// 	{ID: 2, UserID: 1, Date: "2025-08-14", Category: "Travel", Amount: 1200, Description: "Taxi"},
	// }
	// expensesMu sync.Mutex

	// payments = []Payment{
	// 	{ID: 1, UserID: 1, Date: "2025-08-10", Amount: 500, Status: "Success"},
	// 	{ID: 2, UserID: 1, Date: "2025-08-01", Amount: 1200, Status: "Pending"},
	// }
	// paymentsMu sync.Mutex
)

func initDB() error {
	dbURL := os.Getenv("SUPABASE_DB_URL")
	if dbURL == "" {
		return fmt.Errorf("SUPABASE_DB_URL not set")
	}
	var err error
	db, err = pgxpool.New(context.Background(), dbURL)
	if err != nil {
		return err
	}
	return db.Ping(context.Background())
}
func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes), err
}

func checkPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func generateJWT(userID int) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
}

// JWT Auth Middleware
func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || len(authHeader) < 8 || authHeader[:7] != "Bearer " {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Missing or invalid Authorization header"})
			return
		}
		tokenStr := authHeader[7:]
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}
		c.Next()
	}
}

func main() {
	_ = godotenv.Load()
	if err := initDB(); err != nil {
		fmt.Println("[DB ERROR] Failed to connect to database:", err)
		os.Exit(1)
	} else {
		fmt.Println("[DB CONNECTED] Successfully connected to database.")
	}

	r := gin.Default()
	r.Use(cors.Default())
	// AI Categorization endpoint (calls external Python AI microservice)
	r.POST("/api/ai/categorize", func(c *gin.Context) {
		var req struct {
			Description string `json:"description"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.Description == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Description required"})
			return
		}
		// Call Python AI service (assumes running at http://localhost:8001/categorize)
		aiReqBody := []byte(fmt.Sprintf(`{"description": %q}`, req.Description))
		//% resp, err := http.Post("http://localhost:8001/categorize", "application/json", bytes.NewBuffer(aiReqBody))
		resp, err := http.Post("http://localhost:8001/categorize", "application/json", bytes.NewBuffer(aiReqBody))

		if err != nil || resp.StatusCode != 200 {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "AI service unavailable"})
			return
		}
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		c.Data(http.StatusOK, "application/json", body)
	})

	// Resend OTP endpoint (now after r is defined)
	r.POST("/api/resend-otp", func(c *gin.Context) {
		var req struct {
			Email string `json:"email"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}
		var verified bool
		err := db.QueryRow(context.Background(), "SELECT verified FROM users WHERE email=$1", req.Email).Scan(&verified)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "User not found"})
			return
		}
		if verified {
			c.JSON(http.StatusBadRequest, gin.H{"error": "User already verified"})
			return
		}
		otp, err := generateOTP()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate OTP"})
			return
		}
		otpExpires := time.Now().Add(10 * time.Minute)
		_, err = db.Exec(context.Background(), "UPDATE users SET otp_code=$1, otp_expires_at=$2 WHERE email=$3", otp, otpExpires, req.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update OTP"})
			return
		}
		if err := sendOTPEmail(req.Email, otp); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send OTP email"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "OTP resent successfully. Please check your email."})
	})
	// ...existing code...
	// ...existing code...
	// ...existing code...
	// Add this after the auth group is defined

	// ...existing code...

	// ...existing code...

	// Register endpoint (Supabase/PostgreSQL)
	r.POST("/api/register", func(c *gin.Context) {
		var req struct {
			Username string `json:"username"`
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}
		if req.Username == "" || req.Password == "" || req.Email == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username, email, and password required"})
			return
		}
		// Check if user exists (by username or email)
		var exists bool
		err := db.QueryRow(context.Background(), "SELECT EXISTS(SELECT 1 FROM users WHERE name=$1 OR email=$2)", req.Username, req.Email).Scan(&exists)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
			return
		}
		if exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username or email already exists"})
			return
		}
		hash, err := hashPassword(req.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}
		otp, err := generateOTP()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate OTP"})
			return
		}
		otpExpires := time.Now().Add(10 * time.Minute)
		_, err = db.Exec(context.Background(), "INSERT INTO users (name, email, password_hash, otp_code, otp_expires_at, verified) VALUES ($1, $2, $3, $4, $5, $6)", req.Username, req.Email, hash, otp, otpExpires, false)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}
		// Send OTP email
		if err := sendOTPEmail(req.Email, otp); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send OTP email"})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully. Please check your email for the OTP."})
	})

	// OTP verification endpoint
	r.POST("/api/verify-otp", func(c *gin.Context) {
		var req struct {
			Email string `json:"email"`
			OTP   string `json:"otp"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}
		var dbOTP string
		var expiresAt time.Time
		err := db.QueryRow(context.Background(), "SELECT otp_code, otp_expires_at FROM users WHERE email=$1", req.Email).Scan(&dbOTP, &expiresAt)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email or OTP"})
			return
		}
		if dbOTP != req.OTP {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Incorrect OTP"})
			return
		}
		if time.Now().After(expiresAt) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "OTP expired"})
			return
		}
		// Mark user as verified and clear OTP fields
		_, err = db.Exec(context.Background(), "UPDATE users SET verified=true, otp_code=NULL, otp_expires_at=NULL WHERE email=$1", req.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify user"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Email verified successfully!"})
	})

	// Login endpoint (Supabase/PostgreSQL)
	r.POST("/api/login", func(c *gin.Context) {
		var req struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}
		var id int
		var hash string
		var email string
		var verified bool
		err := db.QueryRow(context.Background(), "SELECT id, password_hash, email, verified FROM users WHERE name=$1", req.Username).Scan(&id, &hash, &email, &verified)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
			return
		}
		if !checkPasswordHash(req.Password, hash) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
			return
		}
		if !verified {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not verified", "unverified": true, "email": email})
			return
		}
		token, err := generateJWT(id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"token": token})
	})

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	// Protected routes
	auth := r.Group("/api", authMiddleware())

	// Get current user info endpoint (now under auth group)
	auth.GET("/me", func(c *gin.Context) {
		userID := getUserIDFromToken(c)
		var username, email string
		err := db.QueryRow(context.Background(), "SELECT name, email FROM users WHERE id=$1", userID).Scan(&username, &email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"username": username, "email": email})
	})

	// Update user profile (username, email, password)
	auth.PUT("/me", func(c *gin.Context) {
		userID := getUserIDFromToken(c)
		var req struct {
			Username *string `json:"username"`
			Email    *string `json:"email"`
			Password *string `json:"password"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}

		// Build update query dynamically
		updates := []string{}
		args := []interface{}{}
		argIdx := 1

		if req.Username != nil && *req.Username != "" {
			updates = append(updates, "name=$"+strconv.Itoa(argIdx))
			args = append(args, *req.Username)
			argIdx++
		}
		if req.Email != nil && *req.Email != "" {
			updates = append(updates, "email=$"+strconv.Itoa(argIdx))
			args = append(args, *req.Email)
			argIdx++
		}
		if req.Password != nil && *req.Password != "" {
			hash, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
				return
			}
			updates = append(updates, "password_hash=$"+strconv.Itoa(argIdx))
			args = append(args, string(hash))
			argIdx++
		}

		if len(updates) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No fields to update"})
			return
		}

		// Check for email/username uniqueness if changed
		if req.Username != nil && *req.Username != "" {
			var exists bool
			err := db.QueryRow(context.Background(), "SELECT EXISTS(SELECT 1 FROM users WHERE name=$1 AND id<>$2)", *req.Username, userID).Scan(&exists)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check username"})
				return
			}
			if exists {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Username already taken"})
				return
			}
		}
		if req.Email != nil && *req.Email != "" {
			var exists bool
			err := db.QueryRow(context.Background(), "SELECT EXISTS(SELECT 1 FROM users WHERE email=$1 AND id<>$2)", *req.Email, userID).Scan(&exists)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check email"})
				return
			}
			if exists {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Email already taken"})
				return
			}
		}

		// Build final query
		query := "UPDATE users SET " + strings.Join(updates, ", ") + " WHERE id=$" + strconv.Itoa(argIdx)
		args = append(args, userID)
		_, err := db.Exec(context.Background(), query, args...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Profile updated"})
	})

	// Get current user's budget
	auth.GET("/user/budget", func(c *gin.Context) {
		userID := getUserIDFromToken(c)
		var budget float64
		err := db.QueryRow(context.Background(), "SELECT budget FROM users WHERE id=$1", userID).Scan(&budget)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch budget"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"budget": budget})
	})

	// Set current user's budget
	auth.POST("/user/budget", func(c *gin.Context) {
		userID := getUserIDFromToken(c)
		var req struct {
			Budget float64 `json:"budget"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}
		_, err := db.Exec(context.Background(), "UPDATE users SET budget=$1 WHERE id=$2", req.Budget, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update budget"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Budget updated", "budget": req.Budget})
	})

	// Razorpay order creation endpoint
	auth.POST("/razorpay/order", func(c *gin.Context) {
		userID := getUserIDFromToken(c)
		var req struct {
			Amount   int64  `json:"amount"`
			Currency string `json:"currency"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
			return
		}
		if req.Amount <= 0 || req.Currency == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Amount and currency required"})
			return
		}

		// Razorpay client (test keys for development)
		key := "rzp_test_R5ZEYHFFHdm7dx"     // Replace with your actual test key ID
		secret := "OHOSxJ363b2d0MAoLg8U8X1I" // Replace with your actual test key secret
		client := razorpay.NewClient(key, secret)

		data := map[string]interface{}{
			"amount":          req.Amount, // amount in paise
			"currency":        req.Currency,
			"receipt":         "user-" + strconv.Itoa(userID) + "-" + strconv.FormatInt(time.Now().Unix(), 10),
			"payment_capture": 1,
		}
		order, err := client.Order.Create(data, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create Razorpay order", "details": err.Error()})
			return
		}
		c.JSON(http.StatusOK, order)
	})

	auth.GET("/expenses", func(c *gin.Context) {
		userID := getUserIDFromToken(c)
		rows, err := db.Query(context.Background(), "SELECT id, user_id, date, category, amount, payment_status, description, paid FROM expenses WHERE user_id=$1", userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
			return
		}
		defer rows.Close()
		userExpenses := make([]Expense, 0)
		for rows.Next() {
			var exp Expense
			if err := rows.Scan(&exp.ID, &exp.UserID, &exp.Date, &exp.Category, &exp.Amount, &exp.PaymentStatus, &exp.Description, &exp.Paid); err == nil {
				userExpenses = append(userExpenses, exp)
			}
		}
		c.JSON(http.StatusOK, userExpenses)
	})

	auth.POST("/expenses", func(c *gin.Context) {
		userID := getUserIDFromToken(c)
		var input struct {
			Date          string  `json:"date"`
			Category      string  `json:"category"`
			Amount        float64 `json:"amount"`
			PaymentStatus string  `json:"payment_status"`
			Description   string  `json:"description"`
			Paid          bool    `json:"paid"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		var exp Expense
		exp.Category = input.Category
		exp.Amount = input.Amount
		exp.PaymentStatus = input.PaymentStatus
		exp.Description = input.Description
		exp.Paid = input.Paid
		// Parse date string
		if input.Date != "" {
			t, err := time.Parse("2006-01-02", input.Date)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD."})
				return
			}
			exp.Date = t
		} else {
			exp.Date = time.Now()
		}
		if exp.PaymentStatus == "" {
			exp.PaymentStatus = "Unpaid"
		}
		err := db.QueryRow(context.Background(),
			"INSERT INTO expenses (user_id, date, category, amount, payment_status, description, paid) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
			userID, exp.Date, exp.Category, exp.Amount, exp.PaymentStatus, exp.Description, exp.Paid).Scan(&exp.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add expense"})
			return
		}
		exp.UserID = userID
		c.JSON(http.StatusCreated, exp)
	})
	auth.GET("/payments", func(c *gin.Context) {
		userID := getUserIDFromToken(c)
		rows, err := db.Query(context.Background(), "SELECT id, user_id, payment_date, amount, expense_id, category, description FROM payments WHERE user_id=$1", userID)
		// rows, err := db.Query(context.Background(), "SELECT id, user_id, payment_date, amount, expense_id, category, description FROM payments", userID)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
			return
		}
		defer rows.Close()
		userPayments := make([]Payment, 0)
		i := 0
		for rows.Next() {
			var pay Payment
			if err := rows.Scan(&pay.ID, &pay.UserID, &pay.PaymentDate, &pay.Amount, &pay.ExpenseID, &pay.Category, &pay.Description); err == nil {
				// If payment is linked to an expense, override category and description from expense
				if pay.ExpenseID != nil {
					var category, description string
					err := db.QueryRow(context.Background(), "SELECT category, description FROM expenses WHERE id=$1", *pay.ExpenseID).Scan(&category, &description)
					if err == nil {
						pay.Category = &category
						pay.Description = &description
					}
				}
				userPayments = append(userPayments, pay)
				// fmt.Printf("[DEBUG] Appended payment #%d: %+v\n", i+1, pay)
			} else {
				// fmt.Printf("[ERROR] Scan error for payment row #%d: %v\n", i+1, err)
			}
			i++
		}
		// fmt.Printf("[DEBUG] /payments for user_id=%d, found %d payments\n", userID, len(userPayments))
		c.JSON(http.StatusOK, userPayments)
	})
	auth.POST("/payments", func(c *gin.Context) {
		userID := getUserIDFromToken(c)
		var input struct {
			PaymentDate string  `json:"payment_date"`
			Amount      float64 `json:"amount"`
			ExpenseID   *int    `json:"expense_id"`
			Category    string  `json:"category"`
			Description string  `json:"description"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		var paymentDate time.Time
		var err error
		if input.PaymentDate != "" {
			paymentDate, err = time.Parse("2006-01-02", input.PaymentDate)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment_date format. Use YYYY-MM-DD."})
				return
			}
		} else {
			paymentDate = time.Now()
		}
		var pay Payment
		pay.PaymentDate = paymentDate
		pay.Amount = input.Amount
		pay.ExpenseID = input.ExpenseID
		if input.Category != "" {
			pay.Category = &input.Category
		} else {
			pay.Category = nil
		}
		if input.Description != "" {
			pay.Description = &input.Description
		} else {
			pay.Description = nil
		}
		if pay.ExpenseID != nil {
			err := db.QueryRow(context.Background(),
				"INSERT INTO payments (user_id, payment_date, amount, expense_id) VALUES ($1, $2, $3, $4) RETURNING id",
				userID, paymentDate, input.Amount, *input.ExpenseID).Scan(&pay.ID)
			if err != nil {
				// fmt.Printf("[ERROR] Failed to add payment (linked): %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add payment", "details": err.Error()})
				return
			}
			// Mark expense as paid
			_, err = db.Exec(context.Background(), "UPDATE expenses SET paid=TRUE WHERE id=$1 AND user_id=$2", *input.ExpenseID, userID)
			if err != nil {
				// fmt.Printf("[ERROR] Failed to update expense as paid: %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update expense as paid", "details": err.Error()})
				return
			}
			// Fetch category and description from expense for response
			var category, description string
			err = db.QueryRow(context.Background(), "SELECT category, description FROM expenses WHERE id=$1", *input.ExpenseID).Scan(&category, &description)
			if err == nil {
				pay.Category = &category
				pay.Description = &description
			}
		} else {
			// Manual payment: persist category and description in DB
			err := db.QueryRow(context.Background(),
				"INSERT INTO payments (user_id, payment_date, amount, expense_id, category, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
				userID, paymentDate, input.Amount, nil, input.Category, input.Description).Scan(&pay.ID)
			if err != nil {
				// fmt.Printf("[ERROR] Failed to add payment (manual): %v\n", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add payment", "details": err.Error()})
				return
			}
		}
		pay.UserID = userID
		c.JSON(http.StatusCreated, pay)
	})
	// Delete payment (DELETE)
	auth.DELETE("/payments/:id", func(c *gin.Context) {
		userID := getUserIDFromToken(c)
		idParam := c.Param("id")
		res, err := db.Exec(context.Background(), "DELETE FROM payments WHERE id=$1 AND user_id=$2", atoi(idParam), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete payment"})
			return
		}
		if res.RowsAffected() == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
	})
	// Edit expense (PUT)
	auth.PUT("/expenses/:id", func(c *gin.Context) {
		userID := getUserIDFromToken(c)
		idParam := c.Param("id")
		var updated Expense
		if err := c.ShouldBindJSON(&updated); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		res, err := db.Exec(context.Background(),
			"UPDATE expenses SET date=$1, category=$2, amount=$3, description=$4 WHERE id=$5 AND user_id=$6",
			updated.Date, updated.Category, updated.Amount, updated.Description, atoi(idParam), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update expense"})
			return
		}
		if res.RowsAffected() == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
			return
		}
		updated.ID = atoi(idParam)
		updated.UserID = userID
		c.JSON(http.StatusOK, updated)
	})

	// Delete expense (DELETE)
	auth.DELETE("/expenses/:id", func(c *gin.Context) {
		userID := getUserIDFromToken(c)
		idParam := c.Param("id")
		res, err := db.Exec(context.Background(), "DELETE FROM expenses WHERE id=$1 AND user_id=$2", atoi(idParam), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete expense"})
			return
		}
		if res.RowsAffected() == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
	})

	// Edit payment (PUT)
	auth.PUT("/payments/:id", func(c *gin.Context) {
		userID := getUserIDFromToken(c)
		idParam := c.Param("id")
		var updated struct {
			Amount      float64 `json:"amount"`
			Category    string  `json:"category"`
			Description string  `json:"description"`
		}
		if err := c.ShouldBindJSON(&updated); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		res, err := db.Exec(context.Background(),
			"UPDATE payments SET amount=$1, category=$2, description=$3 WHERE id=$4 AND user_id=$5",
			updated.Amount, updated.Category, updated.Description, atoi(idParam), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update payment"})
			return
		}
		if res.RowsAffected() == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"amount":      updated.Amount,
			"category":    updated.Category,
			"description": updated.Description,
		})
	})

	r.Run() // listen and serve on 0.0.0.0:8080
}

// (containsAny helper removed; now using external AI service)

// Helper to extract user ID from JWT claims
func getUserIDFromToken(c *gin.Context) int {
	authHeader := c.GetHeader("Authorization")
	if len(authHeader) < 8 {
		return 0
	}
	tokenStr := authHeader[7:]
	token, _ := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		if uid, ok := claims["user_id"].(float64); ok {
			return int(uid)
		}
	}
	return 0
}

// Helper to convert string to int
func atoi(s string) int {
	res, err := strconv.Atoi(s)
	if err != nil {
		return 0
	}
	return res
}
